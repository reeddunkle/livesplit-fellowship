import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

import {
  getMilestoneRequirementLookup,
  getMilestoneRequirementLookupKey,
  type MilestoneRequirementEventType,
  type MilestoneRequirementLookup,
} from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import {
  type CompiledFellowshipMilestoneConfiguration,
  type CompiledMilestoneDefinition,
  type CompiledMilestoneRequirement,
  type FellowshipMilestoneConfiguration,
  type MilestoneRequirementsById,
  type MilestoneRequirementTarget,
} from "@/services/fellowship/milestones/milestone-types.ts";

type RequirementCount = {
  readonly lookup: MilestoneRequirementLookup;
  readonly requiredCount: number;
};

function compileMilestoneRequirements(
  configuration: FellowshipMilestoneConfiguration,
): ReadonlyArray<CompiledMilestoneDefinition> {
  return configuration.milestones.map((definition) => {
    const requirementCounts = new Map<string, RequirementCount>();

    for (const requirement of definition.requirements) {
      const lookup = getMilestoneRequirementLookup({
        dungeonId: configuration.dungeon.dungeonId,
        requirement,
      });

      const key = getMilestoneRequirementLookupKey(lookup);

      const existing = requirementCounts.get(key);

      requirementCounts.set(key, {
        lookup,
        requiredCount: (existing?.requiredCount ?? 0) + 1,
      });
    }

    const requirements = Array.from(requirementCounts.entries()).map(
      ([key, requirement]) => {
        return {
          id: requirement.lookup.id,
          key,
          requiredCount: requirement.requiredCount,
          type: requirement.lookup.type,
        } satisfies CompiledMilestoneRequirement;
      },
    );

    return {
      ...definition,
      requirements,
    };
  });
}

export function compileMilestoneConfiguration(
  configuration: FellowshipMilestoneConfiguration,
): CompiledFellowshipMilestoneConfiguration {
  const compiledMilestones = compileMilestoneRequirements(configuration);

  let milestonesById = HashMap.empty<string, CompiledMilestoneDefinition>();

  let requirementsByEvent = HashMap.empty<
    MilestoneRequirementEventType,
    MilestoneRequirementsById
  >();

  for (const definition of compiledMilestones) {
    milestonesById = HashMap.set(
      milestonesById,
      definition.milestoneId,
      definition,
    );

    for (const requirement of definition.requirements) {
      const requirementsById = Option.getOrElse(
        HashMap.get(requirementsByEvent, requirement.type),
        () =>
          HashMap.empty<number, ReadonlyArray<MilestoneRequirementTarget>>(),
      );

      const targets = Option.getOrElse(
        HashMap.get(requirementsById, requirement.id),
        () => [] as ReadonlyArray<MilestoneRequirementTarget>,
      );

      const nextTargets = [
        ...targets,
        {
          milestoneId: definition.milestoneId,
          requiredCount: requirement.requiredCount,
        },
      ];

      const nextRequirementsById = HashMap.set(
        requirementsById,
        requirement.id,
        nextTargets,
      );

      requirementsByEvent = HashMap.set(
        requirementsByEvent,
        requirement.type,
        nextRequirementsById,
      );
    }
  }

  return {
    ...configuration,
    milestonesById,
    requirementsByEvent,
  };
}
