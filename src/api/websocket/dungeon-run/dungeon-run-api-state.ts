import {
  type DungeonRunMilestoneApi,
  type DungeonRunRequirementApi,
  type DungeonRunStateApi,
} from "@/api/websocket/dungeon-run/dungeon-run-api-message-schema.ts";
import {
  analyzeMilestoneProgress,
  type MilestoneProgress,
  type RequirementProgress,
} from "@/services/fellowship/configurations/analyze-milestone-progress.ts";
import { type CompiledConfiguration } from "@/services/fellowship/configurations/configuration-types.ts";
import { type DungeonRunProcessingState } from "@/services/fellowship/dungeon-runs/dungeon-run-processing-state.ts";
import { getElapsedMilliseconds } from "@/util/get-elapsed-milliseconds.ts";

export type CreateRunApiStateOptions = {
  readonly configuration: CompiledConfiguration;
  readonly state: DungeonRunProcessingState;
};

function createRunApiRequirement(
  progress: RequirementProgress,
): DungeonRunRequirementApi {
  return {
    observations: progress.observations.map((observation) => {
      return {
        timestampMilliseconds: observation.timestamp.epochMilliseconds,
      };
    }),
    requiredCount: progress.requirement.requiredCount,
    startOccurrence: progress.requirement.startOccurrence,
    targetId: progress.requirement.targetId,
    type: progress.requirement.type,
  };
}

function createRunApiMilestone({
  progress,
  runStart,
}: {
  readonly progress: MilestoneProgress;
  readonly runStart: DungeonRunProcessingState["runTracker"]["currentStart"];
}): DungeonRunMilestoneApi {
  const completedAtMilliseconds =
    progress.completedAt?.epochMilliseconds ?? null;

  const elapsedMilliseconds =
    progress.completedAt === undefined || runStart === undefined
      ? null
      : getElapsedMilliseconds(runStart.startedAt, progress.completedAt);

  return {
    completedAtMilliseconds,
    elapsedMilliseconds,
    label: progress.definition.label,
    milestoneId: progress.definition.milestoneId,
    requirements: progress.requirements.map(createRunApiRequirement),
  };
}

export function createRunApiState({
  configuration,
  state,
}: CreateRunApiStateOptions): DungeonRunStateApi {
  const analysis = analyzeMilestoneProgress({
    configuration,
    state: state.requirementProcessor,
  });

  const runStart = state.runTracker.currentStart;

  const milestones = analysis.milestones.map((progress) => {
    return createRunApiMilestone({
      progress,
      runStart,
    });
  });

  return {
    dungeonRun:
      runStart === undefined
        ? null
        : {
            startedAtMilliseconds: runStart.startedAt.epochMilliseconds,
          },
    milestones,
  };
}
