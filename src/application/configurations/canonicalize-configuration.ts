import * as Order from "effect/Order";

import {
  getMilestoneRequirementLookup,
  type MilestoneRequirementTargetId,
} from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type DungeonId } from "@/services/fellowship/validation/fellowship-common.ts";
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

type CanonicalConfiguration = {
  readonly dungeonId: DungeonId;
  readonly dungeonLevel: number;
  readonly milestones: ReadonlyArray<CanonicalMilestone>;
};

export type CanonicalConfigurationInput = {
  readonly dungeonId: DungeonId;
  readonly dungeonLevel: number;
  readonly milestones: ReadonlyArray<{
    readonly requirements: ReadonlyArray<CanonicalMilestoneRequirement>;
  }>;
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

function canonicalizeConfiguration(
  configuration: FellowshipMilestoneConfiguration,
): CanonicalConfiguration {
  return canonicalizeNormalizedConfiguration({
    dungeonId: configuration.dungeonId,
    dungeonLevel: configuration.dungeonLevel,
    milestones: configuration.milestones.map((milestone) => {
      return {
        requirements: milestone.requirements.map((requirement) => {
          return canonicalizeRequirement({
            configuration,
            requirement,
          });
        }),
      };
    }),
  });
}

function canonicalizeNormalizedConfiguration(
  configuration: CanonicalConfigurationInput,
): CanonicalConfiguration {
  const milestones = configuration.milestones.map((milestone) => {
    const requirements = [...milestone.requirements].sort(
      CanonicalMilestoneRequirementOrder,
    );

    return {
      requirements,
    } satisfies CanonicalMilestone;
  });

  milestones.sort(CanonicalMilestoneOrder);

  return {
    dungeonId: configuration.dungeonId,
    dungeonLevel: configuration.dungeonLevel,
    milestones,
  };
}

export function serializeCanonicalConfiguration(
  configuration: FellowshipMilestoneConfiguration,
): string {
  return JSON.stringify(canonicalizeConfiguration(configuration));
}

export function serializeNormalizedCanonicalConfiguration(
  configuration: CanonicalConfigurationInput,
): string {
  return JSON.stringify(canonicalizeNormalizedConfiguration(configuration));
}
