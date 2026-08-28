import * as Deferred from "effect/Deferred";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import { FellowshipTrackerLive } from "@/application/tracking/fellowship-tracker-service.ts";
import {
  ConfigurationDAO,
  type ConfigurationDAOShape,
  type PersistedConfiguration,
} from "@/db/daos/configuration/configuration-dao.ts";
import { WebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";
import {
  Fellowship,
  type FellowshipService,
} from "@/services/fellowship/fellowship-service.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import {
  type ConfigurationId,
  ConfigurationIdSchema,
} from "@/validation/configuration/configuration-id.ts";
import { type ConfigurationLabel } from "@/validation/configuration/configuration-label.ts";

import { makeFellowshipTestHarness } from "./fellowship-test-harness.ts";
import { makeWebSocketBroadcasterTestHarness } from "./websocket-broadcaster-test-harness.ts";

const DEFAULT_CONFIGURATION_ID = Schema.decodeUnknownSync(
  ConfigurationIdSchema,
)("0198f5d8-0000-7000-8000-000000000000");

const DEFAULT_CONFIGURATION_LABEL = "Test Configuration";

type FellowshipLiveEvents = ReturnType<FellowshipService["liveEvents"]>;

type MakeFellowshipTrackerTestHarnessOptions = {
  readonly configuration?: FellowshipMilestoneConfiguration;
  readonly configurationId?: ConfigurationId;
  readonly configurationLabel?: ConfigurationLabel;
  readonly liveEvents?: FellowshipLiveEvents;
};

const DEFAULT_CONFIGURATION = {
  dungeonId: "24",
  dungeonLevel: 1,
  milestones: [],
} satisfies FellowshipMilestoneConfiguration;

export function makeFellowshipTrackerTestHarness(
  options: MakeFellowshipTrackerTestHarnessOptions = {},
) {
  return E.gen(function* () {
    const configurationId = options.configurationId ?? DEFAULT_CONFIGURATION_ID;

    const configuration = options.configuration ?? DEFAULT_CONFIGURATION;

    const configurationLabel =
      options.configurationLabel ?? DEFAULT_CONFIGURATION_LABEL;

    const persistedConfiguration = {
      configuration,
      id: configurationId,
      label: configurationLabel,
    } satisfies PersistedConfiguration;

    const trackingStarted = yield* Deferred.make<void>();
    const trackingInterrupted = yield* Deferred.make<void>();

    const defaultLiveEvents = Stream.fromEffect(
      Deferred.succeed(trackingStarted, undefined).pipe(
        E.andThen(E.never),
        E.ensuring(Deferred.succeed(trackingInterrupted, undefined)),
      ),
    );

    const fellowshipHarness = makeFellowshipTestHarness({
      liveEvents: options.liveEvents ?? defaultLiveEvents,
    });

    const webSocketBroadcasterHarness =
      yield* makeWebSocketBroadcasterTestHarness();

    const configurationDAO = {
      delete: () => {
        return E.void;
      },
      getAll: () => {
        return E.succeed([persistedConfiguration]);
      },
      getById: ({ id }) => {
        return E.succeed(
          id === configurationId
            ? Option.some(persistedConfiguration)
            : Option.none(),
        );
      },
      save: () => {
        return E.succeed(persistedConfiguration);
      },
    } satisfies ConfigurationDAOShape;

    const ConfigurationDAOMock = Layer.succeed(
      ConfigurationDAO,
      configurationDAO,
    );

    const FellowshipMock = Layer.succeed(
      Fellowship,
      fellowshipHarness.fellowship,
    );

    const WebSocketBroadcasterMock = Layer.succeed(
      WebSocketBroadcaster,
      webSocketBroadcasterHarness.webSocketBroadcaster,
    );

    const FellowshipTrackerTest = FellowshipTrackerLive.pipe(
      Layer.provide(ConfigurationDAOMock),
      Layer.provide(FellowshipMock),
      Layer.provide(WebSocketBroadcasterMock),
    );

    return {
      configuration,
      configurationId,
      configurationLabel,
      layer: FellowshipTrackerTest,
      trackingInterrupted,
      trackingStarted,
      webSocketBroadcasterHarness,
    };
  });
}
