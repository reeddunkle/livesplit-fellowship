import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

import {
  type ObservedRequirement,
  type ObservedRequirements,
} from "@/services/fellowship/milestones/milestone-processor-state.ts";
import { type MilestoneRequirementId } from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import {
  type CompiledFellowshipMilestoneConfiguration,
  type CompiledMilestoneDefinition,
  type CompiledMilestoneRequirement,
} from "@/services/fellowship/milestones/milestone-types.ts";
import { type RunProcessingState } from "@/services/fellowship/runs/run-processing-state.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";

type RunApiRequirementObservation = {
  readonly timestampMilliseconds: number;
};

type RunApiRequirement = {
  readonly id: MilestoneRequirementId;
  readonly observations: ReadonlyArray<RunApiRequirementObservation>;
  readonly requiredCount: number;
  readonly type: MilestoneRequirementEventType;
};

type RunApiMilestone = {
  readonly completedAtMilliseconds: number | undefined;
  readonly elapsedMilliseconds: number | undefined;
  readonly label: string;
  readonly milestoneId: string;
  readonly requirements: ReadonlyArray<RunApiRequirement>;
};

type RunApiState = {
  readonly milestones: ReadonlyArray<RunApiMilestone>;
  readonly run: {
    readonly startedAtMilliseconds: number;
  } | null;
};

export type CreateRunApiStateOptions = {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly state: RunProcessingState;
};

function getObservedRequirements({
  milestoneId,
  state,
}: {
  readonly milestoneId: string;
  readonly state: RunProcessingState;
}): ObservedRequirements {
  return Option.getOrElse(
    HashMap.get(state.milestoneProcessor.observedRequirements, milestoneId),
    () => HashMap.empty(),
  );
}

function getObservedRequirement({
  observedRequirements,
  requirement,
}: {
  readonly observedRequirements: ObservedRequirements;
  readonly requirement: CompiledMilestoneRequirement;
}): ObservedRequirement | undefined {
  return Option.flatMap(
    HashMap.get(observedRequirements, requirement.type),
    (requirementsById) => {
      return HashMap.get(requirementsById, requirement.id);
    },
  ).pipe(Option.getOrUndefined);
}

function createRunApiRequirement({
  observedRequirements,
  requirement,
}: {
  readonly observedRequirements: ObservedRequirements;
  readonly requirement: CompiledMilestoneRequirement;
}): RunApiRequirement {
  const observedRequirement = getObservedRequirement({
    observedRequirements,
    requirement,
  });

  const observations =
    observedRequirement?.observations.map((observation) => {
      return {
        timestampMilliseconds: observation.timestamp.epochMilliseconds,
      };
    }) ?? [];

  return {
    id: requirement.id,
    observations,
    requiredCount: requirement.requiredCount,
    type: requirement.type,
  };
}

function createRunApiMilestone({
  definition,
  state,
}: {
  readonly definition: CompiledMilestoneDefinition;
  readonly state: RunProcessingState;
}): RunApiMilestone {
  const observedRequirements = getObservedRequirements({
    milestoneId: definition.milestoneId,
    state,
  });

  const observedMilestone = Option.getOrUndefined(
    HashMap.get(
      state.milestoneProcessor.observedMilestones,
      definition.milestoneId,
    ),
  );

  return {
    completedAtMilliseconds: observedMilestone?.timestamp.epochMilliseconds,
    elapsedMilliseconds: observedMilestone?.elapsedMilliseconds,
    label: definition.label,
    milestoneId: definition.milestoneId,
    requirements: definition.requirements.map((requirement) => {
      return createRunApiRequirement({
        observedRequirements,
        requirement,
      });
    }),
  };
}

export function createRunApiState({
  configuration,
  state,
}: CreateRunApiStateOptions): RunApiState {
  const milestones = configuration.milestones.flatMap((milestone) => {
    const definition = Option.getOrUndefined(
      HashMap.get(configuration.milestonesById, milestone.milestoneId),
    );

    if (definition === undefined) {
      return [];
    }

    return [
      createRunApiMilestone({
        definition,
        state,
      }),
    ];
  });

  const runStart = state.runTracker.currentStart;

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
