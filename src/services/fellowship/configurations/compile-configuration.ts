import * as A from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as Order from "effect/Order";

import {
  type CompiledConfiguration,
  type CompiledMilestoneDefinition,
  type CompiledRequirement,
  type FellowshipMilestoneConfiguration,
  type RequirementReference,
  type RequirementReferencesByTargetId,
  type RequirementsByEvent,
} from "@/services/fellowship/configurations/configuration-types.ts";
import { getRequirementLookup } from "@/services/fellowship/requirements/requirement-lookup.ts";
import { type FellowshipRequirement } from "@/services/fellowship/validation/fellowship-configuration-file-schema.ts";
import { type RequirementEventType } from "@/services/fellowship/validation/requirement-event-type-schema.ts";
import { type RequirementObservationIdentity } from "@/validation/common/requirement-observation-identity-schema.ts";

type CompiledConfigurationIndexes = {
  readonly milestonesById: HashMap.HashMap<string, CompiledMilestoneDefinition>;
  readonly requirementsByEvent: RequirementsByEvent;
};

type RequirementIdentity = readonly [
  ...RequirementObservationIdentity,
  startOccurrence: CompiledRequirement["startOccurrence"],
  requiredCount: CompiledRequirement["requiredCount"],
];

const RequirementIdentityOrder = Order.Tuple([
  Order.String,
  Order.String,
  Order.Number,
  Order.Number,
]);

function compileRequirement({
  configuration,
  requirement,
}: {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly requirement: FellowshipRequirement;
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

function getRequirementIdentity(
  requirement: CompiledRequirement,
): RequirementIdentity {
  return [
    requirement.type,
    requirement.targetId,
    requirement.startOccurrence,
    requirement.requiredCount,
  ];
}

function getMilestoneId(
  requirements: ReadonlyArray<CompiledRequirement>,
): string {
  const requirementIdentities = A.map(requirements, getRequirementIdentity);

  const sortedRequirementIdentities = A.sort(
    requirementIdentities,
    RequirementIdentityOrder,
  );

  return JSON.stringify(sortedRequirementIdentities);
}

function compileMilestones(
  configuration: FellowshipMilestoneConfiguration,
): ReadonlyArray<CompiledMilestoneDefinition> {
  return A.map(configuration.milestones, (definition) => {
    const requirements = A.map(definition.requirements, (requirement) => {
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
  A.reduce(milestones, new Set<string>(), (milestoneIds, milestone) => {
    if (milestoneIds.has(milestone.milestoneId)) {
      throw new Error(
        `Duplicate milestone requirements found for "${milestone.label}".`,
      );
    }

    milestoneIds.add(milestone.milestoneId);

    return milestoneIds;
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

  const nextReferences = A.append(references, {
    milestoneId: definition.milestoneId,
    requiredCount: requirement.requiredCount,
    startOccurrence: requirement.startOccurrence,
  });

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
  return A.reduce(
    milestones,
    {
      milestonesById: HashMap.empty<string, CompiledMilestoneDefinition>(),
      requirementsByEvent: HashMap.empty<
        RequirementEventType,
        RequirementReferencesByTargetId
      >(),
    },
    (accumulator, definition) => {
      return {
        milestonesById: HashMap.set(
          accumulator.milestonesById,
          definition.milestoneId,
          definition,
        ),
        requirementsByEvent: A.reduce(
          definition.requirements,
          accumulator.requirementsByEvent,
          (requirementsByEvent, requirement) => {
            return addRequirementReference({
              definition,
              requirement,
              requirementsByEvent,
            });
          },
        ),
      };
    },
  );
}

export function compileConfiguration(
  configuration: FellowshipMilestoneConfiguration,
): CompiledConfiguration {
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
