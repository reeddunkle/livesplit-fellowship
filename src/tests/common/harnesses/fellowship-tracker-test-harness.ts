import * as DateTime from "effect/DateTime";
import * as Deferred from "effect/Deferred";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";

import { FellowshipTrackerLive } from "@/application/tracking/fellowship-tracker-service.ts";
import {
  ConfigurationDAO,
  type ConfigurationDAOShape,
  type PersistedConfiguration,
} from "@/db/daos/configuration/configuration-dao.ts";
import { DungeonRunWebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";
import {
  Fellowship,
  type FellowshipService,
} from "@/services/fellowship/fellowship-service.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import {
  LiveSplit,
  type LiveSplitService,
} from "@/services/live-split/core/live-split-service.ts";
import {
  TEST_CONFIGURATION_FINGERPRINT,
  TEST_CONFIGURATION_ID,
  TEST_CONFIGURATION_LABEL,
} from "@/tests/common/fixtures/configuration-fixtures.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";
import { type ConfigurationLabel } from "@/validation/configuration/configuration-label.ts";

import { makeFellowshipTestHarness } from "./fellowship-test-harness.ts";
import { makeWebSocketBroadcasterTestHarness } from "./websocket-broadcaster-test-harness.ts";

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

const TEST_CREATED_AT = DateTime.makeUnsafe("2026-01-01T00:00:00.000Z");
const TEST_UPDATED_AT = DateTime.makeUnsafe("2026-01-01T00:00:00.000Z");

export function makeFellowshipTrackerTestHarness(
  options: MakeFellowshipTrackerTestHarnessOptions = {},
) {
  return E.gen(function* () {
    const configurationId = options.configurationId ?? TEST_CONFIGURATION_ID;

    const configuration = options.configuration ?? DEFAULT_CONFIGURATION;

    const configurationLabel =
      options.configurationLabel ?? TEST_CONFIGURATION_LABEL;

    const persistedConfiguration = {
      configuration,
      createdAt: TEST_CREATED_AT,
      fingerprint: TEST_CONFIGURATION_FINGERPRINT,
      id: configurationId,
      label: configurationLabel,
      updatedAt: TEST_UPDATED_AT,
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

    const dungeonRunWebSocketBroadcasterHarness =
      yield* makeWebSocketBroadcasterTestHarness();

    const configurationDAO = {
      delete: () => {
        return E.void;
      },
      deleteByDungeonAndLevel: () => {
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
      saveReplacingDungeonAndLevel: () => {
        return E.succeed(persistedConfiguration);
      },
      update: () => {
        return E.succeed(persistedConfiguration);
      },
    } satisfies ConfigurationDAOShape;

    const liveSplit = {
      connect: () => {
        return E.void;
      },
      disconnect: () => {
        return E.void;
      },
      handleRunEvent: () => {
        return E.void;
      },
      status: E.succeed({
        _tag: "Disconnected",
      }),
    } satisfies LiveSplitService;

    const ConfigurationDAOMock = Layer.succeed(
      ConfigurationDAO,
      configurationDAO,
    );

    const FellowshipMock = Layer.succeed(
      Fellowship,
      fellowshipHarness.fellowship,
    );

    const LiveSplitMock = Layer.succeed(LiveSplit, liveSplit);

    const DungeonRunWebSocketBroadcasterMock = Layer.succeed(
      DungeonRunWebSocketBroadcaster,
      dungeonRunWebSocketBroadcasterHarness.webSocketBroadcaster,
    );

    const FellowshipTrackerTest = FellowshipTrackerLive.pipe(
      Layer.provide(ConfigurationDAOMock),
      Layer.provide(FellowshipMock),
      Layer.provide(LiveSplitMock),
      Layer.provide(DungeonRunWebSocketBroadcasterMock),
    );

    return {
      configuration,
      configurationId,
      configurationLabel,
      dungeonRunWebSocketBroadcasterHarness,
      layer: FellowshipTrackerTest,
      trackingInterrupted,
      trackingStarted,
    };
  });
}
