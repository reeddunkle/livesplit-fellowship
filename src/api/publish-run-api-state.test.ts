import * as DateTime from "effect/DateTime";
import * as E from "effect/Effect";
import * as HashMap from "effect/HashMap";
import { describe, expect, test } from "vitest";

import { FELLOWSHIP_DUNGEON } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { compileMilestoneConfiguration } from "@/services/fellowship/milestones/compile-milestone-configuration.ts";
import {
  initialMilestoneProcessorState,
  type MilestoneProcessorState,
  type ObservedRequirementsById,
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
      milestoneId: "desecrator:killed:1",
      requirements: [
        {
          type: "UNIT_DEATH",
          unitTypeId: "42",
        },
      ],
    },
  ],
});

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
                milestoneId: "desecrator:killed:1",
                requirements: [
                  {
                    id: "42",
                    observations: [],
                    requiredCount: 1,
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

      const observedRequirementsById: ObservedRequirementsById = HashMap.make([
        "42",
        {
          observations: [
            {
              timestamp: requirementTimestamp,
            },
          ],
        },
      ]);

      const observedRequirements = HashMap.set(
        HashMap.empty<
          MilestoneRequirementEventType,
          ObservedRequirementsById
        >(),
        "UNIT_DEATH",
        observedRequirementsById,
      );

      const state = createRunProcessingState({
        milestoneProcessor: {
          observedMilestones: HashMap.make([
            "desecrator:killed:1",
            {
              elapsedMilliseconds: 12_345,
              label: "Desecrator 1 Killed",
              milestoneId: "desecrator:killed:1",
              timestamp: requirementTimestamp,
            },
          ]),
          observedRequirements: HashMap.make([
            "desecrator:killed:1",
            observedRequirements,
          ]),
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
                milestoneId: "desecrator:killed:1",
                requirements: [
                  {
                    id: "42",
                    observations: [
                      {
                        timestampMilliseconds: 13_345,
                      },
                    ],
                    requiredCount: 1,
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
                milestoneId: "desecrator:killed:1",
                requirements: [
                  {
                    id: "42",
                    observations: [],
                    requiredCount: 1,
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
