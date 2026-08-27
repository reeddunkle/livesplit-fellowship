import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Semaphore from "effect/Semaphore";

import { processApiEventStream } from "@/application/run-processing/process-api-event-stream.ts";
import { ConfigurationDAO } from "@/db/daos/configuration/configuration-dao.ts";
import { type ConfigurationDAOError } from "@/errors/configuration-dao-error.ts";
import { WebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";
import { Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { type DungeonId } from "@/services/fellowship/validation/fellowship-common.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

export type FellowshipTrackerStatus =
  | {
      readonly _tag: "Idle";
    }
  | {
      readonly _tag: "Tracking";
      readonly configurationId: ConfigurationId;
      readonly dungeonId: DungeonId;
    };

type StartFellowshipTrackerOptions = {
  readonly configurationId: ConfigurationId;
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

  readonly status: E.Effect<FellowshipTrackerStatus>;

  readonly stop: () => E.Effect<void>;
};

export class FellowshipTracker extends Context.Service<
  FellowshipTracker,
  FellowshipTrackerServiceShape
>()("app/FellowshipTracker") {}

type ActiveTracker = {
  readonly configurationId: ConfigurationId;
  readonly dungeonId: DungeonId;
  readonly fiber: Fiber.Fiber<void, unknown>;
};

const make = E.gen(function* () {
  const configurationDAO = yield* ConfigurationDAO;
  const fellowship = yield* Fellowship;
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
        onSome: ({ configurationId, dungeonId }): FellowshipTrackerStatus => {
          return {
            _tag: "Tracking",
            configurationId,
            dungeonId,
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
          configurationId: activeTracker.value.configurationId,
          dungeonId: activeTracker.value.dungeonId,
        });
      }),
    );
  };

  const start: FellowshipTrackerServiceShape["start"] = ({
    configurationId,
  }) => {
    return semaphore.withPermit(
      E.gen(function* () {
        const activeTracker = yield* Ref.get(activeTrackerRef);

        if (Option.isSome(activeTracker)) {
          return yield* E.fail(new FellowshipTrackerAlreadyRunningError());
        }

        const persistedConfiguration = yield* configurationDAO.getById({
          id: configurationId,
        });

        if (Option.isNone(persistedConfiguration)) {
          return yield* E.fail(
            new FellowshipTrackerConfigurationNotFoundError(configurationId),
          );
        }

        const { configuration } = persistedConfiguration.value;

        const trackingEffect = processApiEventStream({
          configuration,
          events: fellowship.liveEvents(),
        }).pipe(
          E.provideService(WebSocketBroadcaster, webSocketBroadcaster),
          E.tapCause((cause) => {
            return E.logError("Fellowship tracker failed.", {
              cause,
              configurationId,
              dungeonId: configuration.dungeonId,
            });
          }),
          E.ensuring(Ref.set(activeTrackerRef, Option.none())),
        );

        const fiber = yield* E.forkIn(trackingEffect, scope);

        yield* Ref.set(
          activeTrackerRef,
          Option.some({
            configurationId,
            dungeonId: configuration.dungeonId,
            fiber,
          }),
        );

        yield* E.logInfo("Started Fellowship tracker.", {
          configurationId,
          dungeonId: configuration.dungeonId,
          milestoneCount: configuration.milestones.length,
        });
      }),
    );
  };

  return {
    start,
    status,
    stop,
  } satisfies FellowshipTrackerServiceShape;
});

export const FellowshipTrackerLive = Layer.effect(FellowshipTracker, make);
