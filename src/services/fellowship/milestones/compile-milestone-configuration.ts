import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

import { getMilestoneRequirementLookup } from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import {
  type CompiledFellowshipMilestoneConfiguration,
  type CompiledMilestoneDefinition,
  type CompiledMilestoneRequirement,
  type FellowshipMilestoneConfiguration,
  type MilestoneRequirementReference,
  type MilestoneRequirementReferencesByTargetId,
  type RequirementsByEvent,
} from "@/services/fellowship/milestones/milestone-types.ts";
import { type FellowshipMilestoneRequirement } from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";

type CompiledMilestoneConfigurationIndexes = {
  readonly milestonesById: HashMap.HashMap<string, CompiledMilestoneDefinition>;
  readonly requirementsByEvent: RequirementsByEvent;
};

function compileMilestoneRequirement({
  configuration,
  requirement,
}: {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly requirement: FellowshipMilestoneRequirement;
}): CompiledMilestoneRequirement {
  const lookup = getMilestoneRequirementLookup({
    dungeonId: configuration.dungeon.dungeonId,
    requirement,
  });

  return {
    requiredCount: requirement.requiredCount,
    startOccurrence: requirement.startOccurrence,
    targetId: lookup.targetId,
    type: lookup.type,
  };
}

function getMilestoneRequirementIdentityKey(
  requirement: CompiledMilestoneRequirement,
): string {
  return JSON.stringify([
    requirement.type,
    requirement.targetId,
    requirement.startOccurrence,
    requirement.requiredCount,
  ]);
}

function getMilestoneId(
  requirements: ReadonlyArray<CompiledMilestoneRequirement>,
): string {
  const requirementKeys = requirements
    .map(getMilestoneRequirementIdentityKey)
    .sort();

  return JSON.stringify(requirementKeys);
}

function compileMilestones(
  configuration: FellowshipMilestoneConfiguration,
): ReadonlyArray<CompiledMilestoneDefinition> {
  return configuration.milestones.map((definition) => {
    const requirements = definition.requirements.map((requirement) => {
      return compileMilestoneRequirement({
        configuration,
        requirement,
      });
    });

    return {
      ...definition,
      milestoneId: getMilestoneId(requirements),
      requirements,
    };
  });
}

function assertUniqueMilestones(
  milestones: ReadonlyArray<CompiledMilestoneDefinition>,
): void {
  const milestoneIds = new Set<string>();

  milestones.forEach((milestone) => {
    if (milestoneIds.has(milestone.milestoneId)) {
      throw new Error(
        `Duplicate milestone requirements found for "${milestone.label}".`,
      );
    }

    milestoneIds.add(milestone.milestoneId);
  });
}

function addRequirementReference({
  definition,
  requirement,
  requirementsByEvent,
}: {
  readonly definition: CompiledMilestoneDefinition;
  readonly requirement: CompiledMilestoneRequirement;
  readonly requirementsByEvent: RequirementsByEvent;
}): RequirementsByEvent {
  const referencesByTargetId = Option.getOrElse(
    HashMap.get(requirementsByEvent, requirement.type),
    () => HashMap.empty(),
  );

  const references = Option.getOrElse(
    HashMap.get(referencesByTargetId, requirement.targetId),
    () => [] as ReadonlyArray<MilestoneRequirementReference>,
  );

  const nextReferences: ReadonlyArray<MilestoneRequirementReference> = [
    ...references,
    {
      milestoneId: definition.milestoneId,
      requiredCount: requirement.requiredCount,
      startOccurrence: requirement.startOccurrence,
    },
  ];

  const nextReferencesByTargetId = HashMap.set(
    referencesByTargetId,
    requirement.targetId,
    nextReferences,
  );

  return HashMap.set(
    requirementsByEvent,
    requirement.type,
    nextReferencesByTargetId,
  );
}

function createIndexes(
  milestones: ReadonlyArray<CompiledMilestoneDefinition>,
): CompiledMilestoneConfigurationIndexes {
  return milestones.reduce<CompiledMilestoneConfigurationIndexes>(
    (accumulator, definition) => {
      return {
        milestonesById: HashMap.set(
          accumulator.milestonesById,
          definition.milestoneId,
          definition,
        ),
        requirementsByEvent: definition.requirements.reduce(
          (requirementsByEvent, requirement) => {
            return addRequirementReference({
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
        MilestoneRequirementReferencesByTargetId
      >(),
    },
  );
}

export function compileMilestoneConfiguration(
  configuration: FellowshipMilestoneConfiguration,
): CompiledFellowshipMilestoneConfiguration {
  const milestones = compileMilestones(configuration);

  assertUniqueMilestones(milestones);

  const { milestonesById, requirementsByEvent } = createIndexes(milestones);

  return {
    dungeon: configuration.dungeon,
    milestones,
    milestonesById,
    requirementsByEvent,
  };
}
