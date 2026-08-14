import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

import {
  getMilestoneRequirementLookup,
  getMilestoneRequirementLookupKey,
  type MilestoneRequirementEventType,
  type MilestoneRequirementId,
  type MilestoneRequirementLookup,
} from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import {
  type CompiledFellowshipMilestoneConfiguration,
  type CompiledMilestoneDefinition,
  type CompiledMilestoneRequirement,
  type FellowshipMilestoneConfiguration,
  type MilestoneRequirementsById,
  type MilestoneRequirementTarget,
  type RequirementsByEvent,
} from "@/services/fellowship/milestones/milestone-types.ts";

type RequirementCount = {
  readonly lookup: MilestoneRequirementLookup;
  readonly requiredCount: number;
};

type CompiledMilestoneConfigurationIndexes = {
  readonly milestonesById: HashMap.HashMap<string, CompiledMilestoneDefinition>;
  readonly requirementsByEvent: RequirementsByEvent;
};

function compileMilestoneRequirements(
  configuration: FellowshipMilestoneConfiguration,
): ReadonlyArray<CompiledMilestoneDefinition> {
  return configuration.milestones.map((definition) => {
    const requirementCounts = definition.requirements.reduce(
      (counts, requirement) => {
        const lookup = getMilestoneRequirementLookup({
          dungeonId: configuration.dungeon.dungeonId,
          requirement,
        });

        const key = getMilestoneRequirementLookupKey(lookup);

        const requiredCount = Option.match(HashMap.get(counts, key), {
          onNone: () => 1,
          onSome: ({ requiredCount }) => requiredCount + 1,
        });

        return HashMap.set(counts, key, {
          lookup,
          requiredCount,
        });
      },
      HashMap.empty<string, RequirementCount>(),
    );

    const requirements = Array.from(requirementCounts).map(
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

function addRequirementTarget({
  definition,
  requirement,
  requirementsByEvent,
}: {
  readonly definition: CompiledMilestoneDefinition;
  readonly requirement: CompiledMilestoneRequirement;
  readonly requirementsByEvent: RequirementsByEvent;
}): RequirementsByEvent {
  const requirementsById = Option.getOrElse(
    HashMap.get(requirementsByEvent, requirement.type),
    () =>
      HashMap.empty<
        MilestoneRequirementId,
        ReadonlyArray<MilestoneRequirementTarget>
      >(),
  );

  const targets = Option.getOrElse(
    HashMap.get(requirementsById, requirement.id),
    () => [] as ReadonlyArray<MilestoneRequirementTarget>,
  );

  const nextTargets: ReadonlyArray<MilestoneRequirementTarget> = [
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

  return HashMap.set(
    requirementsByEvent,
    requirement.type,
    nextRequirementsById,
  );
}

export function compileMilestoneConfiguration(
  configuration: FellowshipMilestoneConfiguration,
): CompiledFellowshipMilestoneConfiguration {
  const compiledMilestones = compileMilestoneRequirements(configuration);

  const { milestonesById, requirementsByEvent } =
    compiledMilestones.reduce<CompiledMilestoneConfigurationIndexes>(
      (accumulator, definition) => {
        return {
          milestonesById: HashMap.set(
            accumulator.milestonesById,
            definition.milestoneId,
            definition,
          ),
          requirementsByEvent: definition.requirements.reduce(
            (requirementsByEvent, requirement) => {
              return addRequirementTarget({
                definition,
                requirement,
                requirementsByEvent,
              });
            },
            accumulator.requirementsByEvent,
          ),
        };
      },
      {
        milestonesById: HashMap.empty<string, CompiledMilestoneDefinition>(),
        requirementsByEvent: HashMap.empty<
          MilestoneRequirementEventType,
          MilestoneRequirementsById
        >(),
      },
    );

  return {
    ...configuration,
    milestonesById,
    requirementsByEvent,
  };
}
