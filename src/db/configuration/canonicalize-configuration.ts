import * as Order from "effect/Order";

import {
  getMilestoneRequirementLookup,
  type MilestoneRequirementTargetId,
} from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type FellowshipMilestoneRequirement } from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";

type CanonicalMilestoneRequirement = {
  readonly requiredCount: number;
  readonly startOccurrence: number;
  readonly targetId: MilestoneRequirementTargetId;
  readonly type: MilestoneRequirementEventType;
};

type CanonicalMilestone = {
  readonly requirements: ReadonlyArray<CanonicalMilestoneRequirement>;
};

type CanonicalMilestoneConfiguration = {
  readonly dungeonId: string;
  readonly milestones: ReadonlyArray<CanonicalMilestone>;
};

const CanonicalMilestoneRequirementOrder = Order.Struct({
  requiredCount: Order.Number,
  startOccurrence: Order.Number,
  targetId: Order.String,
  type: Order.String,
});

const CanonicalMilestoneOrder = Order.Struct({
  requirements: Order.Array(CanonicalMilestoneRequirementOrder),
});

function canonicalizeRequirement({
  configuration,
  requirement,
}: {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly requirement: FellowshipMilestoneRequirement;
}): CanonicalMilestoneRequirement {
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

function canonicalizeMilestoneConfiguration(
  configuration: FellowshipMilestoneConfiguration,
): CanonicalMilestoneConfiguration {
  const milestones = configuration.milestones.map((milestone) => {
    const requirements = milestone.requirements
      .map((requirement) => {
        return canonicalizeRequirement({
          configuration,
          requirement,
        });
      })
      .sort(CanonicalMilestoneRequirementOrder);

    return {
      requirements,
    } satisfies CanonicalMilestone;
  });

  milestones.sort(CanonicalMilestoneOrder);

  return {
    dungeonId: configuration.dungeon.dungeonId,
    milestones,
  };
}

export function serializeCanonicalMilestoneConfiguration(
  configuration: FellowshipMilestoneConfiguration,
): string {
  return JSON.stringify(canonicalizeMilestoneConfiguration(configuration));
}
