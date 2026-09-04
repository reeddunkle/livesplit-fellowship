import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as E from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";

import { publishDungeonRunState } from "@/api/websocket/dungeon-run/publish-dungeon-run-state.ts";
import { makeDungeonRunPersistence } from "@/application/dungeon-run-processing/dungeon-run-persistence.ts";
import { handleLogDungeonRunEvent } from "@/application/dungeon-run-processing/handle-log-dungeon-run-event.ts";
import { ConfigurationDAO } from "@/db/daos/configuration/configuration-dao.ts";
import { DungeonRunDAO } from "@/db/daos/dungeon-run/dungeon-run-dao.ts";
import { DungeonRunObservationDAO } from "@/db/daos/dungeon-run-observation/dungeon-run-observation-dao.ts";
import {
  FellowshipTrackerAlreadyRunningError,
  FellowshipTrackerConfigurationNotFoundError,
} from "@/errors/fellowship-tracker-error.ts";
import { DungeonRunWebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";
import {
  createInitialDungeonRunState,
  interruptDungeonRunProcessingState,
} from "@/services/fellowship/dungeon-runs/dungeon-run-processing-state.ts";
import { processDungeonRunEventStream } from "@/services/fellowship/dungeon-runs/process-dungeon-run-event-stream.ts";
import { Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { LiveSplit } from "@/services/live-split/core/live-split-service.ts";

import {
  type ActiveTracker,
  type FellowshipTrackerServiceShape,
  type FellowshipTrackerStatus,
  type StartTrackingOptions,
} from "./fellowship-tracker-service-types.ts";

export class FellowshipTracker extends Context.Service<
  FellowshipTracker,
  FellowshipTrackerServiceShape
>()("app/FellowshipTracker") {}

const make = E.gen(function* () {
  const configurationDAO = yield* ConfigurationDAO;
  const dungeonRunDAO = yield* DungeonRunDAO;
  const dungeonRunObservationDAO = yield* DungeonRunObservationDAO;
  const dungeonRunWebSocketBroadcaster = yield* DungeonRunWebSocketBroadcaster;
  const fellowship = yield* Fellowship;
  const liveSplit = yield* LiveSplit;
  const scope = yield* E.scope;

  const semaphore = yield* Semaphore.make(1);

  const activeTrackerRef = yield* Ref.make<Option.Option<ActiveTracker>>(
    Option.none(),
  );

  const statusRef = yield* SubscriptionRef.make<FellowshipTrackerStatus>({
    _tag: "Idle",
  });

  const status: FellowshipTrackerServiceShape["status"] =
    SubscriptionRef.get(statusRef);

  const statusChanges: FellowshipTrackerServiceShape["statusChanges"] =
    SubscriptionRef.changes(statusRef);

  const clearActiveTracker = (): E.Effect<void> => {
    return E.gen(function* () {
      yield* SubscriptionRef.set(statusRef, {
        _tag: "Idle",
      });

      yield* Ref.set(activeTrackerRef, Option.none());
    });
  };

  const startTracking = E.fn("fellowship.tracker.start-tracking")(function* ({
    configuration,
    events,
    source,
  }: StartTrackingOptions) {
    yield* E.annotateCurrentSpan(
      "fellowship.dungeonId",
      configuration.dungeonId,
    );

    yield* E.annotateCurrentSpan("fellowship.tracker.source", source._tag);

    return yield* semaphore.withPermit(
      E.gen(function* () {
        const activeTracker = yield* Ref.get(activeTrackerRef);

        if (Option.isSome(activeTracker)) {
          return yield* E.fail(new FellowshipTrackerAlreadyRunningError());
        }

        const dungeonRunPersistence =
          source._tag === "Persisted"
            ? yield* makeDungeonRunPersistence({
                configuration,
                configurationDefinitionId: source.configurationDefinitionId,
              }).pipe(
                E.provideService(DungeonRunDAO, dungeonRunDAO),
                E.provideService(
                  DungeonRunObservationDAO,
                  dungeonRunObservationDAO,
                ),
              )
            : undefined;

        const dungeonRunStateRef = yield* Ref.make(
          createInitialDungeonRunState(),
        );

        const trackingEffect = processDungeonRunEventStream({
          configuration,
          events,
        }).pipe(
          Stream.runForEach((result) => {
            const updateStateEffect = Ref.set(dungeonRunStateRef, result.state);

            const hasRelevantResult =
              result.observation !== undefined ||
              result.processingEvents.length > 0;

            if (!hasRelevantResult) {
              return updateStateEffect;
            }

            const persistResultEffect =
              dungeonRunPersistence === undefined
                ? E.void
                : dungeonRunPersistence
                    .persist({
                      observation: result.observation,
                      processingEvents: result.processingEvents,
                    })
                    .pipe(
                      E.catch((error) => {
                        return E.logError(
                          "Failed to persist dungeon run event result.",
                          {
                            error,
                          },
                        );
                      }),
                    );

            const sendLiveSplitCommandsEffect = E.forEach(
              result.processingEvents,
              (processingEvent) => {
                return liveSplit.handleRunEvent(processingEvent);
              },
              {
                discard: true,
              },
            );

            const logEffects = E.forEach(
              result.processingEvents,
              (processingEvent) => {
                return handleLogDungeonRunEvent({
                  processingEvent,
                });
              },
              {
                discard: true,
              },
            );

            const publishStateEffect = publishDungeonRunState({
              state: result.state,
            }).pipe(
              E.provideService(
                DungeonRunWebSocketBroadcaster,
                dungeonRunWebSocketBroadcaster,
              ),
            );

            return updateStateEffect.pipe(
              E.andThen(
                E.all(
                  [
                    logEffects,
                    sendLiveSplitCommandsEffect,
                    publishStateEffect,
                    persistResultEffect,
                  ],
                  {
                    concurrency: "unbounded",
                    discard: true,
                  },
                ),
              ),
            );
          }),
          E.tapCause((cause) => {
            return E.logError("Fellowship tracker failed.", {
              cause,
              dungeonId: configuration.dungeonId,
              source,
            });
          }),
          E.ensuring(clearActiveTracker()),
        );

        const fiber = yield* E.forkIn(trackingEffect, scope);

        yield* Ref.set(
          activeTrackerRef,
          Option.some({
            dungeonId: configuration.dungeonId,
            fiber,
            persistence: dungeonRunPersistence,
            source,
            stateRef: dungeonRunStateRef,
          }),
        );

        yield* SubscriptionRef.set(statusRef, {
          _tag: "Tracking",
          dungeonId: configuration.dungeonId,
          source,
        });

        yield* E.logInfo("Started Fellowship tracker.", {
          dungeonId: configuration.dungeonId,
          milestoneCount: configuration.milestones.length,
          source,
        });

        return fiber;
      }),
    );
  });

  const start: FellowshipTrackerServiceShape["start"] = E.fn(
    "fellowship.tracker.start",
  )(function* ({ configurationId }) {
    yield* E.annotateCurrentSpan("fellowship.configurationId", configurationId);

    const persistedConfiguration = yield* configurationDAO.getById({
      id: configurationId,
    });

    if (Option.isNone(persistedConfiguration)) {
      return yield* E.fail(
        new FellowshipTrackerConfigurationNotFoundError(configurationId),
      );
    }

    yield* startTracking({
      configuration: persistedConfiguration.value.configuration,
      events: fellowship.liveEvents(),
      source: {
        _tag: "Persisted",
        configurationDefinitionId:
          persistedConfiguration.value.configurationDefinitionId,
        configurationId,
      },
    });
  });

  const startConfiguration: FellowshipTrackerServiceShape["startConfiguration"] =
    E.fn("fellowship.tracker.start-configuration")(function* ({
      configuration,
    }) {
      yield* startTracking({
        configuration,
        events: fellowship.liveEvents(),
        source: {
          _tag: "External",
        },
      });
    });

  const stop: FellowshipTrackerServiceShape["stop"] = E.fn(
    "fellowship.tracker.stop",
  )(function* () {
    yield* semaphore.withPermit(
      E.gen(function* () {
        const activeTracker = yield* Ref.get(activeTrackerRef);

        if (Option.isNone(activeTracker)) {
          return;
        }

        const tracker = activeTracker.value;

        yield* E.annotateCurrentSpan("fellowship.dungeonId", tracker.dungeonId);

        yield* E.annotateCurrentSpan(
          "fellowship.tracker.source",
          tracker.source._tag,
        );

        yield* Fiber.interrupt(tracker.fiber);

        const currentState = yield* Ref.get(tracker.stateRef);

        if (currentState.dungeonRun?.status === "ACTIVE") {
          const endedAt = yield* DateTime.now;

          const interruptedState = interruptDungeonRunProcessingState({
            endedAt,
            state: currentState,
          });

          yield* Ref.set(tracker.stateRef, interruptedState);

          if (tracker.persistence !== undefined) {
            yield* tracker.persistence.interrupt(endedAt).pipe(
              E.catch((error) => {
                return E.logError(
                  "Failed to interrupt persisted dungeon run.",
                  {
                    error,
                  },
                );
              }),
            );
          }

          yield* publishDungeonRunState({
            state: interruptedState,
          }).pipe(
            E.provideService(
              DungeonRunWebSocketBroadcaster,
              dungeonRunWebSocketBroadcaster,
            ),
          );
        }

        yield* E.logInfo("Stopped Fellowship tracker.", {
          dungeonId: tracker.dungeonId,
          source: tracker.source,
        });
      }),
    );
  });

  const replayLog: FellowshipTrackerServiceShape["replayLog"] = E.fn(
    "fellowship.tracker.replay-log",
  )(function* ({ configuration, logFilePath }) {
    yield* E.annotateCurrentSpan("fellowship.log-file-path", logFilePath);

    const fiber = yield* startTracking({
      configuration,
      events: fellowship.streamEvents(logFilePath),
      source: {
        _tag: "External",
      },
    });

    yield* Fiber.join(fiber);
  });

  return {
    replayLog,
    start,
    startConfiguration,
    status,
    statusChanges,
    stop,
  } satisfies FellowshipTrackerServiceShape;
});

export const FellowshipTrackerLive = Layer.effect(FellowshipTracker, make);
