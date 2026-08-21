import * as DateTime from "effect/DateTime";
import * as E from "effect/Effect";
import * as HashMap from "effect/HashMap";
import { describe, expect, test } from "vitest";

import { FELLOWSHIP_DUNGEON } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { compileMilestoneConfiguration } from "@/services/fellowship/milestones/compile-milestone-configuration.ts";
import {
  initialMilestoneProcessorState,
  type MilestoneProcessorState,
  type RequirementObservationsByTargetId,
} from "@/services/fellowship/milestones/milestone-processor-state.ts";
import { type RunProcessingState } from "@/services/fellowship/runs/run-processing-state.ts";
import {
  type DungeonRunTrackerState,
  initialDungeonRunTrackerState,
} from "@/services/fellowship/runs/track-dungeon-run.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";
import { makePushEventServerTestHarness } from "@/tests/common/push-event-server-test-harness.ts";
import { runTest } from "@/tests/common/run-test.ts";

import { publishRunApiState } from "./publish-run-api-state.ts";

const configuration = compileMilestoneConfiguration({
  dungeon: FELLOWSHIP_DUNGEON.EVERDAWN_GROVE,
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
    affixIds: [],
    dungeonId: configuration.dungeon.dungeonId,
    dungeonName: configuration.dungeon.name,
    instanceId: "test-instance",
    startedAt: timestamp,
    timestamp,
    type: "DUNGEON_START",
    unmappedFlag: false,
  };
}

function createRunProcessingState({
  milestoneProcessor = initialMilestoneProcessorState,
  runTracker = initialDungeonRunTrackerState,
}: {
  readonly milestoneProcessor?: MilestoneProcessorState;
  readonly runTracker?: DungeonRunTrackerState;
} = {}): RunProcessingState {
  return {
    milestoneProcessor,
    runTracker,
  };
}

describe("publishRunApiState", () => {
  test("publishes an active run state", async () => {
    const program = E.gen(function* () {
      const harness = yield* makePushEventServerTestHarness();

      const state = createRunProcessingState({
        runTracker: {
          currentEvents: [],
          currentStart: createDungeonStartEvent(1_000),
        },
      });

      yield* publishRunApiState({
        configuration,
        pushEventServer: harness.pushEventServer,
        state,
      });

      const messages = yield* harness.getParsedMessages();

      expect(messages).toEqual([
        {
          state: {
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
            run: {
              startedAtMilliseconds: 1_000,
            },
          },
          version: 1,
        },
      ]);
    });

    await runTest(program);
  });

  test("publishes requirement observations and completed milestone state", async () => {
    const program = E.gen(function* () {
      const harness = yield* makePushEventServerTestHarness();

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
          MilestoneRequirementEventType,
          RequirementObservationsByTargetId
        >(),
        "UNIT_DEATH",
        observationsByTargetId,
      );

      const state = createRunProcessingState({
        milestoneProcessor: {
          requirementObservations,
        },
        runTracker: {
          currentEvents: [],
          currentStart: createDungeonStartEvent(1_000),
        },
      });

      yield* publishRunApiState({
        configuration,
        pushEventServer: harness.pushEventServer,
        state,
      });

      const messages = yield* harness.getParsedMessages();

      expect(messages).toEqual([
        {
          state: {
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
            run: {
              startedAtMilliseconds: 1_000,
            },
          },
          version: 1,
        },
      ]);
    });

    await runTest(program);
  });

  test("publishes an idle run state", async () => {
    const program = E.gen(function* () {
      const harness = yield* makePushEventServerTestHarness();

      yield* publishRunApiState({
        configuration,
        pushEventServer: harness.pushEventServer,
        state: createRunProcessingState(),
      });

      const messages = yield* harness.getParsedMessages();

      expect(messages).toEqual([
        {
          state: {
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
            run: null,
          },
          version: 1,
        },
      ]);
    });

    await runTest(program);
  });
});
