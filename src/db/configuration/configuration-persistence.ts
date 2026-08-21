import * as Match from "effect/Match";

import { createConfigurationFingerprint } from "@/db/configuration/configuration-fingerprint.ts";
import { ConfigurationModel } from "@/db/models/configuration-model.ts";
import {
  type MilestoneId,
  MilestoneModel,
} from "@/db/models/milestone-model.ts";
import { RequirementModel } from "@/db/models/requirement-model.ts";
import { FELLOWSHIP_DUNGEON } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { getMilestoneRequirementLookup } from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type FellowshipMilestoneRequirement } from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";
import { isNonEmptyArray } from "@/util/is-non-empty-array.ts";

import { type PersistedConfiguration } from "./configuration-store.ts";

export type ConfigurationInsert = typeof ConfigurationModel.insert.Type;
export type MilestoneInsert = typeof MilestoneModel.insert.Type;
export type RequirementInsert = typeof RequirementModel.insert.Type;

export type ConfigurationPersistenceRecords = {
  readonly configuration: ConfigurationInsert;
  readonly milestones: ReadonlyArray<MilestoneInsert>;
  readonly requirements: ReadonlyArray<RequirementInsert>;
};

export type CreateConfigurationPersistenceRecordsOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
};

export type CreatePersistedConfigurationOptions = {
  readonly configuration: ConfigurationModel;
  readonly milestones: ReadonlyArray<MilestoneModel>;
  readonly requirements: ReadonlyArray<RequirementModel>;
};

function getDungeonKey(
  configuration: FellowshipMilestoneConfiguration,
): string {
  const entry = Object.entries(FELLOWSHIP_DUNGEON).find(([, dungeon]) => {
    return dungeon.dungeonId === configuration.dungeon.dungeonId;
  });

  if (entry === undefined) {
    throw new Error(
      `Could not find dungeon key for dungeon "${configuration.dungeon.name}".`,
    );
  }

  return entry[0];
}

function getDungeon(dungeonKey: string) {
  const entry = Object.entries(FELLOWSHIP_DUNGEON).find(([key]) => {
    return key === dungeonKey;
  });

  if (entry === undefined) {
    throw new Error(`Unknown dungeon key "${dungeonKey}".`);
  }

  return entry[1];
}

function createRequirementInsert({
  configuration,
  milestoneId,
  requirement,
}: {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly milestoneId: MilestoneId;
  readonly requirement: FellowshipMilestoneRequirement;
}): RequirementInsert {
  const lookup = getMilestoneRequirementLookup({
    dungeonId: configuration.dungeon.dungeonId,
    requirement,
  });

  return RequirementModel.insert.make({
    milestoneId,
    requiredCount: requirement.requiredCount,
    startOccurrence: requirement.startOccurrence,
    targetId: lookup.targetId,
    type: lookup.type,
  });
}

function createMilestoneRequirement(
  requirement: RequirementModel,
): FellowshipMilestoneRequirement {
  const common = {
    requiredCount: requirement.requiredCount,
    startOccurrence: requirement.startOccurrence,
  };

  return Match.value(requirement.type).pipe(
    Match.when(FELLOWSHIP_EVENT.ABILITY_ACTIVATED, (type) => ({
      ...common,
      abilityId: requirement.targetId,
      type,
    })),
    Match.when(FELLOWSHIP_EVENT.DUNGEON_START, (type) => ({
      ...common,
      type,
    })),
    Match.when(FELLOWSHIP_EVENT.DUNGEON_END, (type) => ({
      ...common,
      type,
    })),
    Match.when(FELLOWSHIP_EVENT.ENCOUNTER_START, (type) => ({
      ...common,
      encounterId: requirement.targetId,
      type,
    })),
    Match.when(FELLOWSHIP_EVENT.ENCOUNTER_END, (type) => ({
      ...common,
      encounterId: requirement.targetId,
      type,
    })),
    Match.when(FELLOWSHIP_EVENT.UNIT_DEATH, (type) => ({
      ...common,
      type,
      unitTypeId: requirement.targetId,
    })),
    Match.exhaustive,
  );
}

export function createConfigurationPersistenceRecords({
  configuration,
}: CreateConfigurationPersistenceRecordsOptions): ConfigurationPersistenceRecords {
  const { canonicalJson, fingerprint } =
    createConfigurationFingerprint(configuration);

  const configurationRecord = ConfigurationModel.insert.make({
    canonicalJson,
    dungeonKey: getDungeonKey(configuration),
    fingerprint,
  });

  const milestones: Array<MilestoneInsert> = [];
  const requirements: Array<RequirementInsert> = [];

  configuration.milestones.forEach((milestone) => {
    const milestoneRecord = MilestoneModel.insert.make({
      configurationId: configurationRecord.id,
      label: milestone.label,
    });

    milestones.push(milestoneRecord);

    milestone.requirements.forEach((requirement) => {
      requirements.push(
        createRequirementInsert({
          configuration,
          milestoneId: milestoneRecord.id,
          requirement,
        }),
      );
    });
  });

  return {
    configuration: configurationRecord,
    milestones,
    requirements,
  };
}

export function createPersistedConfiguration({
  configuration,
  milestones,
  requirements,
}: CreatePersistedConfigurationOptions): PersistedConfiguration {
  const dungeon = getDungeon(configuration.dungeonKey);

  const configurationMilestones = milestones.map((milestone) => {
    const milestoneRequirements = requirements
      .filter((requirement) => {
        return requirement.milestoneId === milestone.id;
      })
      .map(createMilestoneRequirement);

    if (!isNonEmptyArray(milestoneRequirements)) {
      throw new Error(
        `Persisted milestone "${milestone.id}" has no requirements.`,
      );
    }

    return {
      label: milestone.label,
      requirements: milestoneRequirements,
    };
  });

  return {
    configuration: {
      dungeon,
      milestones: configurationMilestones,
    },
    id: configuration.id,
  };
}
