import * as A from "effect/Array";
import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";

import { publishDungeonRunState } from "@/api/websocket/dungeon-run/publish-dungeon-run-state.ts";
import { handleLiveSplitDungeonRunEvent } from "@/application/dungeon-run-processing/handle-live-split-dungeon-run-event.ts";
import { handleLogDungeonRunEvent } from "@/application/dungeon-run-processing/handle-log-dungeon-run-event.ts";
import { ConfigurationDAO } from "@/db/daos/configuration/configuration-dao.ts";
import { type ConfigurationDAOError } from "@/errors/configuration-dao-error.ts";
import {
  FellowshipTrackerAlreadyRunningError,
  FellowshipTrackerConfigurationNotFoundError,
} from "@/errors/fellowship-tracker-error.ts";
import { DungeonRunWebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";
import {
  type CompiledConfiguration,
  type FellowshipMilestoneConfiguration,
} from "@/services/fellowship/configurations/configuration-types.ts";
import {
  DUNGEON_RUN_PROCESSING_EVENT,
  type DungeonRunProcessingEvent,
} from "@/services/fellowship/dungeon-runs/process-dungeon-run-event.ts";
import { processDungeonRunEventStream } from "@/services/fellowship/dungeon-runs/process-dungeon-run-event-stream.ts";
import { Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { type DungeonId } from "@/services/fellowship/validation/fellowship-common.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";
import { LiveSplit } from "@/services/live-split/core/live-split-service.ts";
import { type ConfigurationDefinitionId } from "@/validation/configuration/configuration-definition-id-schema.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id-schema.ts";

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

  readonly stop: () => E.Effect<void>;
};

export class FellowshipTracker extends Context.Service<
  FellowshipTracker,
  FellowshipTrackerServiceShape
>()("app/FellowshipTracker") {}

type ActiveTracker = {
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

  const publishProcessingEvent = ({
    configuration,
    processingEvent,
  }: {
    readonly configuration: CompiledConfiguration;
    readonly processingEvent: DungeonRunProcessingEvent;
  }) => {
    return Match.value(processingEvent).pipe(
      Match.when(
        {
          type: DUNGEON_RUN_PROCESSING_EVENT.REQUIREMENT_SATISFIED,
        },
        (requirementSatisfiedEvent) => {
          return publishDungeonRunRequirementSatisfied({
            configuration,
            requirement: requirementSatisfiedEvent.requirement,
            webSocketBroadcaster: runWebSocketBroadcaster,
          });
        },
      ),
      Match.orElse(() => {
        return E.void;
      }),
    );
  };

  const handleProcessingEvent = ({
    configuration,
    processingEvent,
  }: {
    readonly configuration: CompiledConfiguration;
    readonly processingEvent: DungeonRunProcessingEvent;
  }) => {
    return E.all(
      [
        handleLiveSplitDungeonRunEvent({
          event: processingEvent,
          liveSplitClient: liveSplit,
        }),
        handleLogDungeonRunEvent({
          event: processingEvent,
        }),
        publishProcessingEvent({
          configuration,
          processingEvent,
        }),
      ],
      {
        concurrency: "unbounded",
        discard: true,
      },
    );
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

        /*
         * Persistence will eventually slot in here as well.
         *
         * If the persisted dungeon run is still active when tracking is
         * manually stopped, the persistence abstraction should mark that run
         * as interrupted.
         *
         * I would avoid putting a DungeonRunId Ref back into ActiveTracker.
         * Whatever abstraction we introduce for persistence should own its
         * lazily-created dungeon run identity.
         *
         * Example:
         *
         * if (activeTracker.value.source._tag === "Persisted") {
         *   yield* interruptPersistedDungeonRun(...)
         * }
         */

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

        /*
         * Persistence setup will eventually happen once per tracker here.
         *
         * I expect this to create some persistence-scoped state that can lazily
         * create a dungeon_run when the first observation needs to be
         * persisted.
         *
         * For example:
         *
         * const dungeonRunPersistence =
         *   source._tag === "Persisted"
         *     ? yield* makeDungeonRunPersistence({
         *         configuration,
         *         configurationDefinitionId:
         *           source.configurationDefinitionId,
         *       })
         *     : undefined;
         */

        const trackingEffect = processDungeonRunEventStream({
          configuration,
          events,
        }).pipe(
          Stream.runForEach((result) => {
            const hasRelevantResult =
              result.observation !== undefined ||
              result.processingEvents.length > 0;

            if (!hasRelevantResult) {
              return E.void;
            }

            const liveSplitEvents = A.map(
              result.processingEvents,
              handleLiveSplitDungeonRunEvent,
            );

            /*
             * Each processing event is handled in order.
             *
             * This is important for LiveSplit. A single Fellowship event could
             * theoretically produce multiple processing events, and commands
             * like reset/start/split/pause should not race each other.
             */
            const handleProcessingEvents = E.forEach(
              result.processingEvents,
              (processingEvent) => {
                return handleProcessingEvent({
                  configuration: result.configuration,
                  processingEvent,
                });
              },
              {
                discard: true,
              },
            );

            const publishState = publishDungeonRunState({
              configuration: result.configuration,
              state: result.state,
              webSocketBroadcaster: runWebSocketBroadcaster,
            });

            /*
             * Persistence will slot in alongside the live handlers rather than
             * gating them.
             *
             * The helper should own:
             *
             * - lazily creating the dungeon_run when an observation first
             *   requires persistence
             * - persisting result.observation when present
             * - interpreting lifecycle processing events for persisted run
             *   status
             * - retaining whatever dungeon run identity is needed across
             *   stream elements
             *
             * Suggested name:
             *
             * const persistResult =
             *   source._tag === "Persisted"
             *     ? persistDungeonRunEventResult({
             *         configuration: result.configuration,
             *         configurationDefinitionId:
             *           source.configurationDefinitionId,
             *         observation: result.observation,
             *         processingEvents: result.processingEvents,
             *         persistence: dungeonRunPersistence,
             *       }).pipe(
             *         E.catch((error) => {
             *           return E.logError(
             *             "Failed to persist dungeon run event result.",
             *             { error },
             *           );
             *         }),
             *       )
             *     : E.void;
             */

            return E.all(
              [
                handleProcessingEvents,
                publishState,
                // persistResult,
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
