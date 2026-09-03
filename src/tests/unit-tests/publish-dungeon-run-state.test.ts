import * as DateTime from "effect/DateTime";
import * as E from "effect/Effect";
import * as HashMap from "effect/HashMap";
import { describe, expect, test } from "vitest";

import { publishDungeonRunState } from "@/api/websocket/dungeon-run/publish-dungeon-run-state.ts";
import { DungeonRunWebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";
import { compileConfiguration } from "@/services/fellowship/configurations/compile-configuration.ts";
import { type DungeonRunProcessingState } from "@/services/fellowship/dungeon-runs/dungeon-run-processing-state.ts";
import {
  type DungeonRunTrackerState,
  initialDungeonRunTrackerState,
} from "@/services/fellowship/dungeon-runs/track-dungeon-run.ts";
import {
  initialRequirementProcessorState,
  type RequirementObservationsByTargetId,
  type RequirementProcessorState,
} from "@/services/fellowship/requirements/requirement-processor-state.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";
import { type RequirementEventType } from "@/services/fellowship/validation/requirement-event-type-schema.ts";
import { makeWebSocketBroadcasterTestHarness } from "@/tests/common/harnesses/websocket-broadcaster-test-harness.ts";
import { runTest } from "@/tests/common/run-test.ts";

const DUNGEON_NAME = "Everdawn Grove";

const configuration = compileConfiguration({
  dungeonId: "11",
  dungeonLevel: 1,
  milestones: [
    {
      label: "Desecrator 1 Killed",
      requirements: [
        {
          requiredCount: 1,
          startOccurrence: 1,
          type: "UNIT_DEATH",
          unitTypeId: "42",
        },
      ],
    },
  ],
});

const [milestone] = configuration.milestones;

if (milestone === undefined) {
  throw new Error("Expected test configuration to contain a milestone.");
}

function createDungeonStartEvent(
  timestampMilliseconds: number,
): DungeonStartEvent {
  const timestamp = DateTime.makeUnsafe(timestampMilliseconds);

  return {
    absoluteDungeonLevel: configuration.dungeonLevel + 20,
    affixIds: [],
    dungeonId: configuration.dungeonId,
    dungeonLevel: configuration.dungeonLevel,
    dungeonName: DUNGEON_NAME,
    startedAt: timestamp,
    timestamp,
    type: "DUNGEON_START",
    unmappedFlag: false,
  };
}

function createRunProcessingState({
  requirementProcessor = initialRequirementProcessorState,
  runTracker = initialDungeonRunTrackerState,
}: {
  readonly requirementProcessor?: RequirementProcessorState;
  readonly runTracker?: DungeonRunTrackerState;
} = {}): DungeonRunProcessingState {
  return {
    requirementProcessor,
    runTracker,
  };
}

describe("publishDungeonRunState", () => {
  test("publishes an active run state", async () => {
    const program = E.gen(function* () {
      const webSocketBroadcasterHarness =
        yield* makeWebSocketBroadcasterTestHarness();

      const state = createRunProcessingState({
        runTracker: {
          currentEvents: [],
          currentStart: createDungeonStartEvent(1_000),
        },
      });

      yield* publishDungeonRunState({
        configuration,
        state,
      }).pipe(
        E.provideService(
          DungeonRunWebSocketBroadcaster,
          webSocketBroadcasterHarness.webSocketBroadcaster,
        ),
      );

      const messages = yield* webSocketBroadcasterHarness.getParsedMessages();

      expect(messages).toEqual([
        {
          state: {
            dungeonRun: {
              startedAtMilliseconds: 1_000,
            },
            milestones: [
              {
                completedAtMilliseconds: null,
                elapsedMilliseconds: null,
                label: "Desecrator 1 Killed",
                milestoneId: milestone.milestoneId,
                requirements: [
                  {
                    observations: [],
                    requiredCount: 1,
                    startOccurrence: 1,
                    targetId: "42",
                    type: "UNIT_DEATH",
                  },
                ],
              },
            ],
          },
          version: 1,
        },
      ]);
    });

    await runTest(program);
  });

  test("publishes requirement observations and completed milestone state", async () => {
    const program = E.gen(function* () {
      const webSocketBroadcasterHarness =
        yield* makeWebSocketBroadcasterTestHarness();

      const requirementTimestamp = DateTime.makeUnsafe(13_345);

      const observationsByTargetId: RequirementObservationsByTargetId =
        HashMap.make([
          "42",
          {
            observations: [
              {
                timestamp: requirementTimestamp,
              },
            ],
          },
        ]);

      const requirementObservations = HashMap.set(
        HashMap.empty<
          RequirementEventType,
          RequirementObservationsByTargetId
        >(),
        "UNIT_DEATH",
        observationsByTargetId,
      );

      const state = createRunProcessingState({
        requirementProcessor: {
          requirementObservations,
        },
        runTracker: {
          currentEvents: [],
          currentStart: createDungeonStartEvent(1_000),
        },
      });

      yield* publishDungeonRunState({
        configuration,
        state,
      }).pipe(
        E.provideService(
          DungeonRunWebSocketBroadcaster,
          webSocketBroadcasterHarness.webSocketBroadcaster,
        ),
      );

      const messages = yield* webSocketBroadcasterHarness.getParsedMessages();

      expect(messages).toEqual([
        {
          state: {
            dungeonRun: {
              startedAtMilliseconds: 1_000,
            },
            milestones: [
              {
                completedAtMilliseconds: 13_345,
                elapsedMilliseconds: 12_345,
                label: "Desecrator 1 Killed",
                milestoneId: milestone.milestoneId,
                requirements: [
                  {
                    observations: [
                      {
                        timestampMilliseconds: 13_345,
                      },
                    ],
                    requiredCount: 1,
                    startOccurrence: 1,
                    targetId: "42",
                    type: "UNIT_DEATH",
                  },
                ],
              },
            ],
          },
          version: 1,
        },
      ]);
    });

    await runTest(program);
  });

  test("publishes an idle run state", async () => {
    const program = E.gen(function* () {
      const webSocketBroadcasterHarness =
        yield* makeWebSocketBroadcasterTestHarness();

      yield* publishDungeonRunState({
        configuration,
        state: createRunProcessingState(),
      }).pipe(
        E.provideService(
          DungeonRunWebSocketBroadcaster,
          webSocketBroadcasterHarness.webSocketBroadcaster,
        ),
      );

      const messages = yield* webSocketBroadcasterHarness.getParsedMessages();

      expect(messages).toEqual([
        {
          state: {
            dungeonRun: null,
            milestones: [
              {
                completedAtMilliseconds: null,
                elapsedMilliseconds: null,
                label: "Desecrator 1 Killed",
                milestoneId: milestone.milestoneId,
                requirements: [
                  {
                    observations: [],
                    requiredCount: 1,
                    startOccurrence: 1,
                    targetId: "42",
                    type: "UNIT_DEATH",
                  },
                ],
              },
            ],
          },
          version: 1,
        },
      ]);
    });

    await runTest(program);
  });
});
