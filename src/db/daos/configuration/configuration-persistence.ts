import * as A from "effect/Array";
import * as E from "effect/Effect";
import * as Match from "effect/Match";

import {
  createConfigurationDefinitionFingerprint,
  createConfigurationFingerprint,
} from "@/application/configurations/configuration-fingerprint.ts";
import { ConfigurationDefinitionModel } from "@/db/models/configuration-definition-model.ts";
import { ConfigurationModel } from "@/db/models/configuration-model.ts";
import { MilestoneModel } from "@/db/models/milestone-model.ts";
import { MilestoneRequirementModel } from "@/db/models/milestone-requirement-model.ts";
import { RequirementModel } from "@/db/models/requirement-model.ts";
import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { getMilestoneRequirementLookup } from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type FellowshipMilestoneRequirement } from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";
import { isNonEmptyArray } from "@/util/is-non-empty-array.ts";
import { type ConfigurationDefinitionId } from "@/validation/configuration/configuration-definition-id-schema.ts";
import { type ConfigurationLabel } from "@/validation/configuration/configuration-label-schema.ts";

import { type PersistedConfiguration } from "./configuration-dao.ts";

type ConfigurationDefinitionInsert =
  typeof ConfigurationDefinitionModel.insert.Type;
type ConfigurationInsert = typeof ConfigurationModel.insert.Type;
type MilestoneInsert = typeof MilestoneModel.insert.Type;
type MilestoneRequirementInsert = typeof MilestoneRequirementModel.insert.Type;
type RequirementInsert = typeof RequirementModel.insert.Type;

type RequirementIdentity = {
  readonly requiredCount: number;
  readonly startOccurrence: number;
  readonly targetId: string;
  readonly type: MilestoneRequirementEventType;
};

export type ConfigurationPersistenceRecords = {
  readonly configuration: ConfigurationInsert;
  readonly configurationDefinition: ConfigurationDefinitionInsert;
  readonly milestoneRequirements: ReadonlyArray<MilestoneRequirementInsert>;
  readonly milestones: ReadonlyArray<MilestoneInsert>;
  readonly requirements: ReadonlyArray<RequirementInsert>;
};

export type CreateConfigurationPersistenceRecordsOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly label: ConfigurationLabel;
};

export type CreatePersistedConfigurationOptions = {
  readonly configuration: ConfigurationModel;
  readonly configurationDefinition: ConfigurationDefinitionModel;
  readonly milestoneRequirements: ReadonlyArray<MilestoneRequirementModel>;
  readonly milestones: ReadonlyArray<MilestoneModel>;
  readonly requirements: ReadonlyArray<RequirementModel>;
};

function getRequirementIdentityKey(requirement: RequirementIdentity): string {
  return JSON.stringify([
    requirement.type,
    requirement.targetId,
    requirement.startOccurrence,
    requirement.requiredCount,
  ]);
}

export function getMilestoneRequirementsIdentityKey(
  requirements: ReadonlyArray<RequirementIdentity>,
): string {
  return JSON.stringify(requirements.map(getRequirementIdentityKey).sort());
}

function createRequirementIdentity({
  configuration,
  requirement,
}: {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly requirement: FellowshipMilestoneRequirement;
}): RequirementIdentity {
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

function createRequirementInsert({
  configuration,
  configurationDefinitionId,
  requirement,
}: {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly configurationDefinitionId: ConfigurationDefinitionId;
  readonly requirement: FellowshipMilestoneRequirement;
}): RequirementInsert {
  const identity = createRequirementIdentity({
    configuration,
    requirement,
  });

  return RequirementModel.insert.make({
    configurationDefinitionId,
    ...identity,
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
  label,
}: CreateConfigurationPersistenceRecordsOptions): E.Effect<
  ConfigurationPersistenceRecords,
  Error
> {
  return E.gen(function* () {
    const definitionFingerprintResult =
      yield* createConfigurationDefinitionFingerprint(configuration);

    const configurationFingerprintResult =
      yield* createConfigurationFingerprint(configuration);

    const configurationDefinition = ConfigurationDefinitionModel.insert.make({
      canonicalJson: definitionFingerprintResult.canonicalJson,
      dungeonId: configuration.dungeonId,
      dungeonLevel: configuration.dungeonLevel,
      fingerprint: definitionFingerprintResult.fingerprint,
    });

    const configurationRecord = ConfigurationModel.insert.make({
      canonicalJson: configurationFingerprintResult.canonicalJson,
      configurationDefinitionId: configurationDefinition.id,
      fingerprint: configurationFingerprintResult.fingerprint,
      label,
    });

    const requirementsByIdentity = new Map<string, RequirementInsert>();

    configuration.milestones.forEach((milestone) => {
      milestone.requirements.forEach((requirement) => {
        const identity = createRequirementIdentity({
          configuration,
          requirement,
        });

        const identityKey = getRequirementIdentityKey(identity);

        if (requirementsByIdentity.has(identityKey)) {
          return;
        }

        requirementsByIdentity.set(
          identityKey,
          createRequirementInsert({
            configuration,
            configurationDefinitionId: configurationDefinition.id,
            requirement,
          }),
        );
      });
    });

    const requirements = Array.from(requirementsByIdentity.values());
    const milestones: Array<MilestoneInsert> = [];
    const milestoneRequirements: Array<MilestoneRequirementInsert> = [];

    configuration.milestones.forEach((milestone) => {
      const milestoneRecord = MilestoneModel.insert.make({
        configurationId: configurationRecord.id,
        label: milestone.label,
      });

      milestones.push(milestoneRecord);

      milestone.requirements.forEach((requirement) => {
        const identity = createRequirementIdentity({
          configuration,
          requirement,
        });

        const requirementRecord = requirementsByIdentity.get(
          getRequirementIdentityKey(identity),
        );

        if (requirementRecord === undefined) {
          throw new Error(
            `Could not resolve requirement for milestone "${milestone.label}".`,
          );
        }

        milestoneRequirements.push(
          MilestoneRequirementModel.insert.make({
            milestoneId: milestoneRecord.id,
            requirementId: requirementRecord.id,
          }),
        );
      });
    });

    return {
      configuration: configurationRecord,
      configurationDefinition,
      milestoneRequirements,
      milestones,
      requirements,
    };
  });
}

export function createPersistedConfiguration({
  configuration,
  configurationDefinition,
  milestoneRequirements,
  milestones,
  requirements,
}: CreatePersistedConfigurationOptions): PersistedConfiguration {
  const configurationMilestones = A.map(milestones, (milestone) => {
    const requirementIds = milestoneRequirements
      .filter((milestoneRequirement) => {
        return milestoneRequirement.milestoneId === milestone.id;
      })
      .map((milestoneRequirement) => {
        return milestoneRequirement.requirementId;
      });

    const milestoneRequirementModels = requirements.filter((requirement) => {
      return requirementIds.includes(requirement.id);
    });

    if (!isNonEmptyArray(milestoneRequirementModels)) {
      throw new Error(
        `Persisted milestone "${milestone.id}" has no requirements.`,
      );
    }

    return {
      label: milestone.label,
      requirements: A.map(
        milestoneRequirementModels,
        createMilestoneRequirement,
      ),
    };
  });

  return {
    configuration: {
      dungeonId: configurationDefinition.dungeonId,
      dungeonLevel: configurationDefinition.dungeonLevel,
      milestones: configurationMilestones,
    },
    configurationDefinitionId: configurationDefinition.id,
    createdAt: configuration.createdAt,
    fingerprint: configuration.fingerprint,
    id: configuration.id,
    label: configuration.label,
    updatedAt: configuration.updatedAt,
  };
}
