import * as A from "effect/Array";

import { type PersistedConfiguration } from "@/db/configuration/configuration-store.ts";
import {
  type ConfigurationApiConfiguration,
  type ConfigurationApiMilestone,
  type ConfigurationApiRequirement,
} from "@/services/api/configuration/configuration-api-schema.ts";
import { getMilestoneRequirementLookup } from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type FellowshipMilestoneRequirement } from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";

function createConfigurationApiRequirement({
  dungeonId,
  requirement,
}: {
  readonly dungeonId: string;
  readonly requirement: FellowshipMilestoneRequirement;
}): ConfigurationApiRequirement {
  const lookup = getMilestoneRequirementLookup({
    dungeonId,
    requirement,
  });

  return {
    requiredCount: requirement.requiredCount,
    startOccurrence: requirement.startOccurrence,
    targetId: lookup.targetId,
    type: lookup.type,
  };
}

function createConfigurationApiMilestone({
  dungeonId,
  milestone,
}: {
  readonly dungeonId: string;
  readonly milestone: FellowshipMilestoneConfiguration["milestones"][number];
}): ConfigurationApiMilestone {
  return {
    label: milestone.label,
    requirements: A.map(milestone.requirements, (requirement) =>
      createConfigurationApiRequirement({ dungeonId, requirement }),
    ),
  };
}

export function createConfigurationApiResponse({
  configuration,
  id,
}: PersistedConfiguration): ConfigurationApiConfiguration {
  const dungeonId = configuration.dungeon.dungeonId;

  return {
    dungeonId,
    dungeonName: configuration.dungeon.name,
    id,
    milestones: configuration.milestones.map((milestone) => {
      return createConfigurationApiMilestone({
        dungeonId,
        milestone,
      });
    }),
  };
}
