import {
  type RunApiMilestone,
  type RunApiRequirement,
  type RunApiState,
} from "@/api/websocket/run-api-message-schema.ts";
import { type RunProcessingState } from "@/services/fellowship/dungeon-runs/run-processing-state.ts";
import {
  analyzeMilestoneProgress,
  type MilestoneProgress,
  type RequirementProgress,
} from "@/services/fellowship/milestones/analyze-milestone-progress.ts";
import { type CompiledFellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { getElapsedMilliseconds } from "@/util/get-elapsed-milliseconds.ts";

export type CreateRunApiStateOptions = {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly state: RunProcessingState;
};

function createRunApiRequirement(
  progress: RequirementProgress,
): RunApiRequirement {
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
  readonly runStart: RunProcessingState["runTracker"]["currentStart"];
}): RunApiMilestone {
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
}: CreateRunApiStateOptions): RunApiState {
  const analysis = analyzeMilestoneProgress({
    configuration,
    state: state.milestoneProcessor,
  });

  const runStart = state.runTracker.currentStart;

  const milestones = analysis.milestones.map((progress) => {
    return createRunApiMilestone({
      progress,
      runStart,
    });
  });

  return {
    milestones,
    run:
      runStart === undefined
        ? null
        : {
            startedAtMilliseconds: runStart.startedAt.epochMilliseconds,
          },
  };
}
