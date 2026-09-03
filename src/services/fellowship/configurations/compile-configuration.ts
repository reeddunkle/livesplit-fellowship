import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

import {
  type CompiledFellowshipMilestoneConfiguration,
  type CompiledMilestoneDefinition,
  type CompiledRequirement,
  type FellowshipMilestoneConfiguration,
  type RequirementReference,
  type RequirementReferencesByTargetId,
  type RequirementsByEvent,
} from "@/services/fellowship/configurations/configuration-types.ts";
import { getRequirementLookup } from "@/services/fellowship/requirements/requirement-lookup.ts";
import { type FellowshipMilestoneRequirement } from "@/services/fellowship/validation/fellowship-configuration-file-schema.ts";
import { type RequirementEventType } from "@/services/fellowship/validation/requirement-event-type-schema.ts";

type CompiledConfigurationIndexes = {
  readonly milestonesById: HashMap.HashMap<string, CompiledMilestoneDefinition>;
  readonly requirementsByEvent: RequirementsByEvent;
};

function compileRequirement({
  configuration,
  requirement,
}: {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly requirement: FellowshipMilestoneRequirement;
}): CompiledRequirement {
  const lookup = getRequirementLookup({
    dungeonId: configuration.dungeonId,
    requirement,
  });

  return {
    requiredCount: requirement.requiredCount,
    startOccurrence: requirement.startOccurrence,
    targetId: lookup.targetId,
    type: lookup.type,
  };
}

function getRequirementIdentityKey(requirement: CompiledRequirement): string {
  return JSON.stringify([
    requirement.type,
    requirement.targetId,
    requirement.startOccurrence,
    requirement.requiredCount,
  ]);
}

function getMilestoneId(
  requirements: ReadonlyArray<CompiledRequirement>,
): string {
  const requirementKeys = requirements.map(getRequirementIdentityKey).sort();

  return JSON.stringify(requirementKeys);
}

function compileMilestones(
  configuration: FellowshipMilestoneConfiguration,
): ReadonlyArray<CompiledMilestoneDefinition> {
  return configuration.milestones.map((definition) => {
    const requirements = definition.requirements.map((requirement) => {
      return compileRequirement({
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
  readonly requirement: CompiledRequirement;
  readonly requirementsByEvent: RequirementsByEvent;
}): RequirementsByEvent {
  const referencesByTargetId = Option.getOrElse(
    HashMap.get(requirementsByEvent, requirement.type),
    () => HashMap.empty(),
  );

  const references = Option.getOrElse(
    HashMap.get(referencesByTargetId, requirement.targetId),
    () => [] as ReadonlyArray<RequirementReference>,
  );

  const nextReferences: ReadonlyArray<RequirementReference> = [
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
): CompiledConfigurationIndexes {
  return milestones.reduce<CompiledConfigurationIndexes>(
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
        RequirementEventType,
        RequirementReferencesByTargetId
      >(),
    },
  );
}

export function compileConfiguration(
  configuration: FellowshipMilestoneConfiguration,
): CompiledFellowshipMilestoneConfiguration {
  const milestones = compileMilestones(configuration);

  assertUniqueMilestones(milestones);

  const { milestonesById, requirementsByEvent } = createIndexes(milestones);

  return {
    dungeonId: configuration.dungeonId,
    dungeonLevel: configuration.dungeonLevel,
    milestones,
    milestonesById,
    requirementsByEvent,
  };
}
