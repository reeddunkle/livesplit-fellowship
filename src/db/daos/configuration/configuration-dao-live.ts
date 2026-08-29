import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import {
  ConfigurationDAO,
  type ConfigurationDAOShape,
  type PersistedConfiguration,
} from "@/db/daos/configuration/configuration-dao.ts";
import {
  createConfigurationPersistenceRecords,
  createPersistedConfiguration,
} from "@/db/daos/configuration/configuration-persistence.ts";
import { ConfigurationModel } from "@/db/models/configuration-model.ts";
import {
  type MilestoneId,
  MilestoneModel,
} from "@/db/models/milestone-model.ts";
import { RequirementModel } from "@/db/models/requirement-model.ts";
import { ConfigurationDAOError } from "@/errors/configuration-dao-error.ts";
import {
  type ConfigurationId,
  ConfigurationIdSchema,
} from "@/validation/configuration/configuration-id.ts";

function mapConfigurationDAOError(cause: unknown): ConfigurationDAOError {
  if (cause instanceof ConfigurationDAOError) {
    return cause;
  }

  return new ConfigurationDAOError({
    details: {
      _tag: "Unexpected",
      cause,
    },
  });
}

function decodeConfigurationRows(
  rows: unknown,
): E.Effect<ReadonlyArray<ConfigurationModel>, ConfigurationDAOError> {
  return Schema.decodeUnknownEffect(Schema.Array(ConfigurationModel))(
    rows,
  ).pipe(E.mapError(mapConfigurationDAOError));
}

function decodeMilestoneRows(
  rows: unknown,
): E.Effect<ReadonlyArray<MilestoneModel>, ConfigurationDAOError> {
  return Schema.decodeUnknownEffect(Schema.Array(MilestoneModel))(rows).pipe(
    E.mapError(mapConfigurationDAOError),
  );
}

function decodeRequirementRows(
  rows: unknown,
): E.Effect<ReadonlyArray<RequirementModel>, ConfigurationDAOError> {
  return Schema.decodeUnknownEffect(Schema.Array(RequirementModel))(rows).pipe(
    E.mapError(mapConfigurationDAOError),
  );
}

const make = E.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const getMilestonesByConfigurationId = (
    configurationId: ConfigurationId,
  ): E.Effect<ReadonlyArray<MilestoneModel>, ConfigurationDAOError> => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          id,
          configuration_id,
          label
        FROM milestone
        WHERE configuration_id = ${configurationId}
      `;

      return yield* decodeMilestoneRows(rows);
    }).pipe(E.mapError(mapConfigurationDAOError));
  };

  const getRequirementsByMilestoneIds = (
    milestoneIds: ReadonlyArray<MilestoneId>,
  ): E.Effect<ReadonlyArray<RequirementModel>, ConfigurationDAOError> => {
    if (milestoneIds.length === 0) {
      return E.succeed([]);
    }

    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          id,
          milestone_id,
          type,
          target_id,
          start_occurrence,
          required_count
        FROM requirement
        WHERE milestone_id IN ${sql.in(milestoneIds)}
      `;

      return yield* decodeRequirementRows(rows);
    }).pipe(E.mapError(mapConfigurationDAOError));
  };

  const hydrateConfiguration = (
    configuration: ConfigurationModel,
  ): E.Effect<PersistedConfiguration, ConfigurationDAOError> => {
    return E.gen(function* () {
      const milestones = yield* getMilestonesByConfigurationId(
        configuration.id,
      );

      const requirements = yield* getRequirementsByMilestoneIds(
        milestones.map((milestone) => milestone.id),
      );

      return yield* E.try({
        catch: mapConfigurationDAOError,
        try: () => {
          return createPersistedConfiguration({
            configuration,
            milestones,
            requirements,
          });
        },
      });
    });
  };

  const getById: ConfigurationDAOShape["getById"] = ({ id }) => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          id,
          dungeon_id,
          dungeon_level,
          label,
          fingerprint,
          canonical_json,
          created_at_milliseconds AS created_at
        FROM configuration
        WHERE id = ${id}
        LIMIT 1
      `;

      const configurations = yield* decodeConfigurationRows(rows);
      const configuration = configurations[0];

      if (configuration === undefined) {
        return Option.none<PersistedConfiguration>();
      }

      const persistedConfiguration = yield* hydrateConfiguration(configuration);

      return Option.some(persistedConfiguration);
    }).pipe(E.mapError(mapConfigurationDAOError));
  };

  const getAll: ConfigurationDAOShape["getAll"] = () => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          id,
          dungeon_id,
          dungeon_level,
          label,
          fingerprint,
          canonical_json,
          created_at_milliseconds AS created_at
        FROM configuration
        ORDER BY created_at_milliseconds
      `;

      const configurations = yield* decodeConfigurationRows(rows);

      const persistedConfigurations: Array<PersistedConfiguration> = [];

      for (const configuration of configurations) {
        persistedConfigurations.push(
          yield* hydrateConfiguration(configuration),
        );
      }

      return persistedConfigurations;
    }).pipe(E.mapError(mapConfigurationDAOError));
  };

  const persistConfiguration = ({
    configuration,
    label,
    replaceDungeonAndLevel,
  }: {
    readonly configuration: Parameters<
      ConfigurationDAOShape["save"]
    >[0]["configuration"];
    readonly label: Parameters<ConfigurationDAOShape["save"]>[0]["label"];
    readonly replaceDungeonAndLevel: boolean;
  }): E.Effect<PersistedConfiguration, ConfigurationDAOError> => {
    return E.gen(function* () {
      const records = yield* createConfigurationPersistenceRecords({
        configuration,
        label,
      }).pipe(E.mapError(mapConfigurationDAOError));

      const configurationInsert = yield* Schema.encodeEffect(
        ConfigurationModel.insert,
      )(records.configuration).pipe(E.mapError(mapConfigurationDAOError));

      const milestoneInserts = yield* E.forEach(
        records.milestones,
        (milestone) => {
          return Schema.encodeEffect(MilestoneModel.insert)(milestone);
        },
      ).pipe(E.mapError(mapConfigurationDAOError));

      const requirementInserts = yield* E.forEach(
        records.requirements,
        (requirement) => {
          return Schema.encodeEffect(RequirementModel.insert)(requirement);
        },
      ).pipe(E.mapError(mapConfigurationDAOError));

      const insertConfigurationChildren = (
        configurationId: ConfigurationId,
      ) => {
        return E.gen(function* () {
          /*
           * Milestone IDs were generated together with the requirement records,
           * so keep those IDs. Only the parent configuration ID needs to be
           * replaced when saving over an existing semantic configuration.
           */
          for (const milestone of milestoneInserts) {
            yield* sql`
              INSERT INTO milestone (
                id,
                configuration_id,
                label
              )
              VALUES (
                ${milestone.id},
                ${configurationId},
                ${milestone.label}
              )
            `;
          }

          /*
           * Requirement records already reference the newly generated
           * milestone IDs above, so they can be inserted unchanged.
           */
          for (const requirement of requirementInserts) {
            yield* sql`
              INSERT INTO requirement (
                id,
                milestone_id,
                type,
                target_id,
                start_occurrence,
                required_count
              )
              VALUES (
                ${requirement.id},
                ${requirement.milestoneId},
                ${requirement.type},
                ${requirement.targetId},
                ${requirement.startOccurrence},
                ${requirement.requiredCount}
              )
            `;
          }
        });
      };

      const configurationId = yield* sql
        .withTransaction(
          E.gen(function* () {
            const existingRows = yield* sql`
              SELECT
                id
              FROM configuration
              WHERE fingerprint = ${configurationInsert.fingerprint}
              LIMIT 1
            `;

            const existingConfiguration = existingRows[0];

            let configurationId: ConfigurationId;

            if (existingConfiguration !== undefined) {
              configurationId = yield* Schema.decodeUnknownEffect(
                ConfigurationIdSchema,
              )(existingConfiguration.id).pipe(
                E.mapError(mapConfigurationDAOError),
              );

              /*
               * The fingerprint only represents semantic configuration data.
               * Labels are editable metadata and therefore need to be updated
               * even when the semantic fingerprint has not changed.
               */
              yield* sql`
                UPDATE configuration
                SET label = ${configurationInsert.label}
                WHERE id = ${configurationId}
              `;

              /*
               * Milestone labels are also excluded from the semantic
               * fingerprint. Recreate the child graph so persisted milestone
               * metadata reflects the submitted configuration.
               *
               * Deleting milestones also deletes their requirements through
               * the milestone -> requirement ON DELETE CASCADE foreign key.
               */
              yield* sql`
                DELETE FROM milestone
                WHERE configuration_id = ${configurationId}
              `;

              yield* insertConfigurationChildren(configurationId);
            } else {
              configurationId = records.configuration.id;

              yield* sql`
                INSERT INTO configuration (
                  id,
                  dungeon_id,
                  dungeon_level,
                  label,
                  fingerprint,
                  canonical_json,
                  created_at_milliseconds
                )
                VALUES (
                  ${configurationInsert.id},
                  ${configurationInsert.dungeonId},
                  ${configurationInsert.dungeonLevel},
                  ${configurationInsert.label},
                  ${configurationInsert.fingerprint},
                  ${configurationInsert.canonicalJson},
                  ${configurationInsert.createdAt}
                )
              `;

              yield* insertConfigurationChildren(configurationId);
            }

            if (replaceDungeonAndLevel) {
              yield* sql`
                DELETE FROM configuration
                WHERE dungeon_id = ${configurationInsert.dungeonId}
                  AND dungeon_level = ${configurationInsert.dungeonLevel}
                  AND id <> ${configurationId}
              `;
            }

            return configurationId;
          }),
        )
        .pipe(E.mapError(mapConfigurationDAOError));

      return {
        configuration,
        fingerprint: records.configuration.fingerprint,
        id: configurationId,
        label,
      };
    });
  };

  const save: ConfigurationDAOShape["save"] = ({ configuration, label }) => {
    return persistConfiguration({
      configuration,
      label,
      replaceDungeonAndLevel: false,
    });
  };

  const saveReplacingDungeonAndLevel: ConfigurationDAOShape["saveReplacingDungeonAndLevel"] =
    ({ configuration, label }) => {
      return persistConfiguration({
        configuration,
        label,
        replaceDungeonAndLevel: true,
      });
    };

  const deleteConfiguration: ConfigurationDAOShape["delete"] = ({ id }) => {
    return sql`
      DELETE FROM configuration
      WHERE id = ${id}
    `.pipe(E.asVoid, E.mapError(mapConfigurationDAOError));
  };

  const deleteByDungeonAndLevel: ConfigurationDAOShape["deleteByDungeonAndLevel"] =
    ({ dungeonId, dungeonLevel }) => {
      return sql`
        DELETE FROM configuration
        WHERE dungeon_id = ${dungeonId}
          AND dungeon_level = ${dungeonLevel}
      `.pipe(E.asVoid, E.mapError(mapConfigurationDAOError));
    };

  return {
    delete: deleteConfiguration,
    deleteByDungeonAndLevel,
    getAll,
    getById,
    save,
    saveReplacingDungeonAndLevel,
  } satisfies ConfigurationDAOShape;
});

export const ConfigurationDAOLive = Layer.effect(ConfigurationDAO, make);
