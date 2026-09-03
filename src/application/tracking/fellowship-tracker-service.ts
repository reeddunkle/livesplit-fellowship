import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";

import { publishDungeonRunState } from "@/api/websocket/dungeon-run/publish-dungeon-run-state.ts";
import { handleLogDungeonRunEvent } from "@/application/dungeon-run-processing/handle-log-dungeon-run-event.ts";
import { ConfigurationDAO } from "@/db/daos/configuration/configuration-dao.ts";
import { DungeonRunDAO } from "@/db/daos/dungeon-run/dungeon-run-dao.ts";
import { DungeonRunObservationDAO } from "@/db/daos/dungeon-run-observation/dungeon-run-observation-dao.ts";
import { type ConfigurationDAOError } from "@/errors/configuration-dao-error.ts";
import { type DungeonRunDAOError } from "@/errors/dungeon-run-dao-error.ts";
import {
  FellowshipTrackerAlreadyRunningError,
  FellowshipTrackerConfigurationNotFoundError,
} from "@/errors/fellowship-tracker-error.ts";
import { DungeonRunWebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/configurations/configuration-types.ts";
import { processDungeonRunEventStream } from "@/services/fellowship/dungeon-runs/process-dungeon-run-event-stream.ts";
import { Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { type DungeonId } from "@/services/fellowship/validation/fellowship-common.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";
import { LiveSplit } from "@/services/live-split/core/live-split-service.ts";
import { type ConfigurationDefinitionId } from "@/validation/configuration/configuration-definition-id-schema.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id-schema.ts";
import { type DungeonRunId } from "@/validation/dungeon-run/dungeon-run-id-schema.ts";

import { persistDungeonRunLifecycleEvents } from "./persist-dungeon-run-lifecycle-events.ts";
import { persistDungeonRunObservation } from "./persist-dungeon-run-observation.ts";
import {
  interruptDungeonRun,
  persistDungeonRunResult,
} from "./persist-dungeon-run-result.ts";
import { publishDungeonRunRequirementSatisfied } from "./publish-dungeon-run-requirement-satisfied.ts";

type FellowshipTrackerConfigurationSource =
  | {
      readonly _tag: "Persisted";
      readonly configurationDefinitionId: ConfigurationDefinitionId;
      readonly configurationId: ConfigurationId;
    }
  | {
      readonly _tag: "External";
    };

export type FellowshipTrackerStatus =
  | {
      readonly _tag: "Idle";
    }
  | {
      readonly _tag: "Tracking";
      readonly dungeonId: DungeonId;
      readonly source: FellowshipTrackerConfigurationSource;
    };

type StartFellowshipTrackerOptions = {
  readonly configurationId: ConfigurationId;
};

type StartFellowshipTrackerConfigurationOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
};

type ReplayFellowshipTrackerLogOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly logFilePath: string;
};

export type FellowshipTrackerStartError =
  | ConfigurationDAOError
  | FellowshipTrackerAlreadyRunningError
  | FellowshipTrackerConfigurationNotFoundError;

export type FellowshipTrackerServiceShape = {
  readonly replayLog: (
    options: ReplayFellowshipTrackerLogOptions,
  ) => E.Effect<void, unknown>;

  readonly start: (
    options: StartFellowshipTrackerOptions,
  ) => E.Effect<void, FellowshipTrackerStartError>;

  readonly startConfiguration: (
    options: StartFellowshipTrackerConfigurationOptions,
  ) => E.Effect<void, FellowshipTrackerAlreadyRunningError>;

  readonly status: E.Effect<FellowshipTrackerStatus>;

  readonly statusChanges: Stream.Stream<FellowshipTrackerStatus>;

  readonly stop: () => E.Effect<void, DungeonRunDAOError>;
};

export class FellowshipTracker extends Context.Service<
  FellowshipTracker,
  FellowshipTrackerServiceShape
>()("app/FellowshipTracker") {}

type ActiveTracker = {
  readonly dungeonRunIdRef: Ref.Ref<Option.Option<DungeonRunId>>;
  readonly dungeonId: DungeonId;
  readonly fiber: Fiber.Fiber<void, unknown>;
  readonly source: FellowshipTrackerConfigurationSource;
};

type StartTrackingOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly events: Stream.Stream<FellowshipEvent, unknown>;
  readonly source: FellowshipTrackerConfigurationSource;
};

const make = E.gen(function* () {
  const configurationDAO = yield* ConfigurationDAO;
  const dungeonRunDAO = yield* DungeonRunDAO;
  const dungeonRunObservationDAO = yield* DungeonRunObservationDAO;
  const fellowship = yield* Fellowship;
  const liveSplit = yield* LiveSplit;
  const runWebSocketBroadcaster = yield* DungeonRunWebSocketBroadcaster;
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

  const stop: FellowshipTrackerServiceShape["stop"] = E.fn(
    "fellowship.tracker.stop",
  )(function* () {
    yield* semaphore.withPermit(
      E.gen(function* () {
        const activeTracker = yield* Ref.get(activeTrackerRef);

        if (Option.isNone(activeTracker)) {
          return;
        }

        yield* E.annotateCurrentSpan(
          "fellowship.dungeonId",
          activeTracker.value.dungeonId,
        );

        yield* E.annotateCurrentSpan(
          "fellowship.tracker.source",
          activeTracker.value.source._tag,
        );

        yield* Fiber.interrupt(activeTracker.value.fiber);

        if (activeTracker.value.source._tag === "Persisted") {
          const dungeonRunId = yield* Ref.get(
            activeTracker.value.dungeonRunIdRef,
          );

          if (Option.isSome(dungeonRunId)) {
            yield* interruptDungeonRun({
              dungeonRunId: dungeonRunId.value,
            }).pipe(E.provideService(DungeonRunDAO, dungeonRunDAO));

            yield* Ref.set(
              activeTracker.value.dungeonRunIdRef,
              Option.none<DungeonRunId>(),
            );
          }
        }

        yield* E.logInfo("Stopped Fellowship tracker.", {
          dungeonId: activeTracker.value.dungeonId,
          source: activeTracker.value.source,
        });
      }),
    );
  });

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

        const dungeonRunIdRef = yield* Ref.make<Option.Option<DungeonRunId>>(
          Option.none(),
        );

        const trackingEffect = processDungeonRunEventStream({
          configuration,
          events,
        }).pipe(
          Stream.runForEach((result) => {
            // This needs to capture the `dungeon_run` row ID
            const persistLifecycle =
              source._tag === "Persisted"
                ? E.gen(function* () {
                    const dungeonRunId = yield* Ref.get(dungeonRunIdRef);

                    const nextDungeonRunId =
                      yield* persistDungeonRunLifecycleEvents({
                        configuration,
                        configurationDefinitionId:
                          source.configurationDefinitionId,
                        dungeonRunId,
                        events: result.lifecycleEvents,
                      }).pipe(E.provideService(DungeonRunDAO, dungeonRunDAO));

                    yield* Ref.set(dungeonRunIdRef, nextDungeonRunId);
                  }).pipe(
                    E.catch((error) => {
                      return E.logError(
                        "Failed to persist dungeon run lifecycle.",
                        {
                          error,
                        },
                      );
                    }),
                  )
                : E.void;

            // These need the `dungeon_run` row ID
            const persistObservations =
              source._tag === "Persisted"
                ? E.gen(function* () {
                    const dungeonRunId = yield* Ref.get(dungeonRunIdRef);

                    if (Option.isNone(dungeonRunId)) {
                      return;
                    }

                    yield* E.forEach(
                      result.observations,
                      (observation) => {
                        return persistDungeonRunObservation({
                          dungeonRunId: dungeonRunId.value,
                          observation,
                        }).pipe(
                          E.provideService(
                            DungeonRunObservationDAO,
                            dungeonRunObservationDAO,
                          ),
                        );
                      },
                      {
                        concurrency: "unbounded",
                        discard: true,
                      },
                    );
                  }).pipe(
                    E.catch((error) => {
                      return E.logError(
                        "Failed to persist dungeon run observations.",
                        {
                          error,
                        },
                      );
                    }),
                  )
                : E.void;

            const publishSatisfiedRequirements = E.forEach(
              result.satisfiedRequirements,
              (requirement) => {
                return publishDungeonRunRequirementSatisfied({
                  configuration: result.configuration,
                  requirement,
                  webSocketBroadcaster: runWebSocketBroadcaster,
                });
              },
              {
                concurrency: "unbounded",
                discard: true,
              },
            );

            const handleCompletedMilestones = E.forEach(
              result.completedMilestones,
              (milestone) => {
                return E.all(
                  [
                    handleLogDungeonRunMilestone(milestone),
                    liveSplit.handleMilestoneCompleted(milestone),
                  ],
                  {
                    concurrency: "unbounded",
                    discard: true,
                  },
                );
              },
              {
                concurrency: "unbounded",
                discard: true,
              },
            );

            const publishState = result.isStateUpdated
              ? publishDungeonRunState({
                  configuration: result.configuration,
                  state: result.state,
                  webSocketBroadcaster: runWebSocketBroadcaster,
                })
              : E.void;

            const persistence = persistLifecycle.pipe(
              E.andThen(persistObservations),
            );

            return E.all(
              [
                handleCompletedMilestones,
                publishSatisfiedRequirements,
                publishState,
                persistence,
              ],
              {
                concurrency: "unbounded",
                discard: true,
              },
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
            dungeonRunIdRef,
            fiber,
            source,
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
