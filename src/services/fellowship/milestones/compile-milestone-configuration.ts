import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

import {
  getMilestoneRequirementLookup,
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

type RequirementCountsById = HashMap.HashMap<
  MilestoneRequirementId,
  RequirementCount
>;

type RequirementCountsByEvent = HashMap.HashMap<
  MilestoneRequirementEventType,
  RequirementCountsById
>;

type CompiledMilestoneConfigurationIndexes = {
  readonly milestonesById: HashMap.HashMap<string, CompiledMilestoneDefinition>;
  readonly requirementsByEvent: RequirementsByEvent;
};

function addRequirementCount({
  countsByEvent,
  lookup,
}: {
  readonly countsByEvent: RequirementCountsByEvent;
  readonly lookup: MilestoneRequirementLookup;
}): RequirementCountsByEvent {
  const countsById = Option.getOrElse(
    HashMap.get(countsByEvent, lookup.type),
    () => HashMap.empty<MilestoneRequirementId, RequirementCount>(),
  );

  const requiredCount = Option.match(HashMap.get(countsById, lookup.id), {
    onNone: () => 1,
    onSome: ({ requiredCount }) => requiredCount + 1,
  });

  const nextCountsById = HashMap.set(countsById, lookup.id, {
    lookup,
    requiredCount,
  });

  return HashMap.set(countsByEvent, lookup.type, nextCountsById);
}

function compileMilestoneRequirements(
  configuration: FellowshipMilestoneConfiguration,
): ReadonlyArray<CompiledMilestoneDefinition> {
  return configuration.milestones.map((definition) => {
    const requirementCounts = definition.requirements.reduce(
      (countsByEvent, requirement) => {
        const lookup = getMilestoneRequirementLookup({
          dungeonId: configuration.dungeon.dungeonId,
          requirement,
        });

        return addRequirementCount({
          countsByEvent,
          lookup,
        });
      },
      HashMap.empty<MilestoneRequirementEventType, RequirementCountsById>(),
    );

    const requirements = Array.from(requirementCounts).flatMap(
      ([, countsById]) => {
        return Array.from(countsById).map(([, requirement]) => {
          return {
            id: requirement.lookup.id,
            requiredCount: requirement.requiredCount,
            type: requirement.lookup.type,
          } satisfies CompiledMilestoneRequirement;
        });
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
