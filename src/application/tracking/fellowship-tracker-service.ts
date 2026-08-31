import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";

import { publishRunApiState } from "@/api/websocket/publish-run-api-state.ts";
import { handleLogRunEvent } from "@/application/run-processing/handle-log-run-event.ts";
import { ConfigurationDAO } from "@/db/daos/configuration/configuration-dao.ts";
import { type ConfigurationDAOError } from "@/errors/configuration-dao-error.ts";
import { WebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";
import { Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { processRunEventStream } from "@/services/fellowship/runs/process-run-event-stream.ts";
import { type DungeonId } from "@/services/fellowship/validation/fellowship-common.ts";
import { LiveSplit } from "@/services/live-split/core/live-split-service.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

export type FellowshipTrackerConfigurationSource =
  | {
      readonly _tag: "Persisted";
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

export class FellowshipTrackerAlreadyRunningError extends Error {
  readonly _tag = "FellowshipTrackerAlreadyRunningError";

  constructor() {
    super("Fellowship tracker is already running.");
  }
}

export class FellowshipTrackerConfigurationNotFoundError extends Error {
  readonly _tag = "FellowshipTrackerConfigurationNotFoundError";

  constructor(readonly configurationId: ConfigurationId) {
    super(`Configuration not found: ${configurationId}`);
  }
}

export type FellowshipTrackerStartError =
  | ConfigurationDAOError
  | FellowshipTrackerAlreadyRunningError
  | FellowshipTrackerConfigurationNotFoundError;

export type FellowshipTrackerServiceShape = {
  readonly start: (
    options: StartFellowshipTrackerOptions,
  ) => E.Effect<void, FellowshipTrackerStartError>;

  readonly startConfiguration: (
    options: StartFellowshipTrackerConfigurationOptions,
  ) => E.Effect<void, FellowshipTrackerAlreadyRunningError>;

  readonly status: E.Effect<FellowshipTrackerStatus>;

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
  readonly source: FellowshipTrackerConfigurationSource;
};

const make = E.gen(function* () {
  const configurationDAO = yield* ConfigurationDAO;
  const fellowship = yield* Fellowship;
  const liveSplit = yield* LiveSplit;
  const webSocketBroadcaster = yield* WebSocketBroadcaster;
  const scope = yield* E.scope;

  const semaphore = yield* Semaphore.make(1);

  const activeTrackerRef = yield* Ref.make<Option.Option<ActiveTracker>>(
    Option.none(),
  );

  const status: FellowshipTrackerServiceShape["status"] = Ref.get(
    activeTrackerRef,
  ).pipe(
    E.map(
      Option.match({
        onNone: (): FellowshipTrackerStatus => {
          return {
            _tag: "Idle",
          };
        },
        onSome: ({ dungeonId, source }): FellowshipTrackerStatus => {
          return {
            _tag: "Tracking",
            dungeonId,
            source,
          };
        },
      }),
    ),
  );

  const stop: FellowshipTrackerServiceShape["stop"] = () => {
    return semaphore.withPermit(
      E.gen(function* () {
        const activeTracker = yield* Ref.get(activeTrackerRef);

        if (Option.isNone(activeTracker)) {
          return;
        }

        yield* Fiber.interrupt(activeTracker.value.fiber);
        yield* Ref.set(activeTrackerRef, Option.none());

        yield* E.logInfo("Stopped Fellowship tracker.", {
          dungeonId: activeTracker.value.dungeonId,
          source: activeTracker.value.source,
        });
      }),
    );
  };

  const startTracking = ({
    configuration,
    source,
  }: StartTrackingOptions): E.Effect<
    void,
    FellowshipTrackerAlreadyRunningError
  > => {
    return semaphore.withPermit(
      E.gen(function* () {
        const activeTracker = yield* Ref.get(activeTrackerRef);

        if (Option.isSome(activeTracker)) {
          return yield* E.fail(new FellowshipTrackerAlreadyRunningError());
        }

        const trackingEffect = processRunEventStream({
          configuration,
          events: fellowship.liveEvents(),
        }).pipe(
          Stream.runForEach((result) => {
            const handleEvents = E.forEach(
              result.events,
              (event) => {
                return E.all(
                  [handleLogRunEvent(event), liveSplit.handleRunEvent(event)],
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
              ? publishRunApiState({
                  configuration: result.configuration,
                  state: result.state,
                  webSocketBroadcaster,
                })
              : E.void;

            return E.all([handleEvents, publishState], {
              concurrency: "unbounded",
              discard: true,
            });
          }),
          E.tapCause((cause) => {
            return E.logError("Fellowship tracker failed.", {
              cause,
              dungeonId: configuration.dungeonId,
              source,
            });
          }),
          E.ensuring(Ref.set(activeTrackerRef, Option.none())),
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

        yield* E.logInfo("Started Fellowship tracker.", {
          dungeonId: configuration.dungeonId,
          milestoneCount: configuration.milestones.length,
          source,
        });
      }),
    );
  };

  const start: FellowshipTrackerServiceShape["start"] = ({
    configurationId,
  }) => {
    return E.gen(function* () {
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
        source: {
          _tag: "Persisted",
          configurationId,
        },
      });
    });
  };

  const startConfiguration: FellowshipTrackerServiceShape["startConfiguration"] =
    ({ configuration }) => {
      return startTracking({
        configuration,
        source: {
          _tag: "External",
        },
      });
    };

  return {
    start,
    startConfiguration,
    status,
    stop,
  } satisfies FellowshipTrackerServiceShape;
});

export const FellowshipTrackerLive = Layer.effect(FellowshipTracker, make);
