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
  getMilestoneRequirementsIdentityKey,
} from "@/db/daos/configuration/configuration-persistence.ts";
import { ConfigurationDefinitionModel } from "@/db/models/configuration-definition-model.ts";
import { ConfigurationModel } from "@/db/models/configuration-model.ts";
import {
  type MilestoneId,
  MilestoneModel,
} from "@/db/models/milestone-model.ts";
import { MilestoneRequirementModel } from "@/db/models/milestone-requirement-model.ts";
import { RequirementModel } from "@/db/models/requirement-model.ts";
import { ConfigurationDAOError } from "@/errors/configuration-dao-error.ts";
import {
  type ConfigurationDefinitionId,
  ConfigurationDefinitionIdSchema,
} from "@/validation/configuration/configuration-definition-id-schema.ts";
import {
  type ConfigurationId,
  ConfigurationIdSchema,
} from "@/validation/configuration/configuration-id-schema.ts";

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

function decodeConfigurationDefinitionRows(
  rows: unknown,
): E.Effect<
  ReadonlyArray<ConfigurationDefinitionModel>,
  ConfigurationDAOError
> {
  return Schema.decodeUnknownEffect(Schema.Array(ConfigurationDefinitionModel))(
    rows,
  ).pipe(E.mapError(mapConfigurationDAOError));
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

function decodeMilestoneRequirementRows(
  rows: unknown,
): E.Effect<ReadonlyArray<MilestoneRequirementModel>, ConfigurationDAOError> {
  return Schema.decodeUnknownEffect(Schema.Array(MilestoneRequirementModel))(
    rows,
  ).pipe(E.mapError(mapConfigurationDAOError));
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

  const getConfigurationDefinitionById = (
    id: ConfigurationDefinitionId,
  ): E.Effect<
    Option.Option<ConfigurationDefinitionModel>,
    ConfigurationDAOError
  > => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          id,
          dungeon_id,
          dungeon_level,
          fingerprint,
          canonical_json,
          created_at,
          updated_at
        FROM configuration_definition
        WHERE id = ${id}
        LIMIT 1
      `;

      const definitions = yield* decodeConfigurationDefinitionRows(rows);
      const definition = definitions[0];

      return definition === undefined
        ? Option.none<ConfigurationDefinitionModel>()
        : Option.some(definition);
    }).pipe(E.mapError(mapConfigurationDAOError));
  };

  const getMilestonesByConfigurationId = (
    configurationId: ConfigurationId,
  ): E.Effect<ReadonlyArray<MilestoneModel>, ConfigurationDAOError> => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          id,
          configuration_id,
          label,
          created_at,
          updated_at
        FROM milestone
        WHERE configuration_id = ${configurationId}
      `;

      return yield* decodeMilestoneRows(rows);
    }).pipe(E.mapError(mapConfigurationDAOError));
  };

  const getRequirementsByConfigurationDefinitionId = (
    configurationDefinitionId: ConfigurationDefinitionId,
  ): E.Effect<ReadonlyArray<RequirementModel>, ConfigurationDAOError> => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          id,
          configuration_definition_id,
          type,
          target_id,
          start_occurrence,
          required_count,
          created_at,
          updated_at
        FROM requirement
        WHERE configuration_definition_id = ${configurationDefinitionId}
      `;

      return yield* decodeRequirementRows(rows);
    }).pipe(E.mapError(mapConfigurationDAOError));
  };

  const getMilestoneRequirementsByMilestoneIds = (
    milestoneIds: ReadonlyArray<MilestoneId>,
  ): E.Effect<
    ReadonlyArray<MilestoneRequirementModel>,
    ConfigurationDAOError
  > => {
    if (milestoneIds.length === 0) {
      return E.succeed([]);
    }

    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          milestone_id,
          requirement_id,
          created_at
        FROM milestone_requirement
        WHERE milestone_id IN ${sql.in(milestoneIds)}
      `;

      return yield* decodeMilestoneRequirementRows(rows);
    }).pipe(E.mapError(mapConfigurationDAOError));
  };

  const hydrateConfiguration = (
    configuration: ConfigurationModel,
  ): E.Effect<PersistedConfiguration, ConfigurationDAOError> => {
    return E.gen(function* () {
      const definition = yield* getConfigurationDefinitionById(
        configuration.configurationDefinitionId,
      );

      if (Option.isNone(definition)) {
        return yield* E.fail(
          mapConfigurationDAOError(
            new Error(
              `Configuration definition "${configuration.configurationDefinitionId}" was not found.`,
            ),
          ),
        );
      }

      const milestones = yield* getMilestonesByConfigurationId(
        configuration.id,
      );

      const requirements = yield* getRequirementsByConfigurationDefinitionId(
        definition.value.id,
      );

      const milestoneRequirements =
        yield* getMilestoneRequirementsByMilestoneIds(
          milestones.map((milestone) => {
            return milestone.id;
          }),
        );

      return yield* E.try({
        catch: mapConfigurationDAOError,
        try: () => {
          return createPersistedConfiguration({
            configuration,
            configurationDefinition: definition.value,
            milestoneRequirements,
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
          configuration_definition_id,
          label,
          fingerprint,
          canonical_json,
          created_at,
          updated_at
        FROM configuration
        WHERE id = ${id}
        LIMIT 1
      `;

      const configurations = yield* decodeConfigurationRows(rows);
      const configuration = configurations[0];

      if (configuration === undefined) {
        return Option.none<PersistedConfiguration>();
      }

      return Option.some(yield* hydrateConfiguration(configuration));
    }).pipe(E.mapError(mapConfigurationDAOError));
  };

  const getAll: ConfigurationDAOShape["getAll"] = () => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          id,
          configuration_definition_id,
          label,
          fingerprint,
          canonical_json,
          created_at,
          updated_at
        FROM configuration
        ORDER BY created_at
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

  const getPersistedConfiguration = (
    id: ConfigurationId,
  ): E.Effect<PersistedConfiguration, ConfigurationDAOError> => {
    return E.gen(function* () {
      const persisted = yield* getById({ id });

      if (Option.isNone(persisted)) {
        return yield* E.fail(
          mapConfigurationDAOError(
            new Error(
              `Configuration "${id}" was not found after it was persisted.`,
            ),
          ),
        );
      }

      return persisted.value;
    });
  };

  const persistConfiguration = ({
    configuration,
    label,
    replaceConfigurationId,
    replaceDungeonAndLevel,
  }: {
    readonly configuration: Parameters<
      ConfigurationDAOShape["save"]
    >[0]["configuration"];
    readonly label: Parameters<ConfigurationDAOShape["save"]>[0]["label"];
    readonly replaceConfigurationId?: ConfigurationId;
    readonly replaceDungeonAndLevel: boolean;
  }): E.Effect<PersistedConfiguration, ConfigurationDAOError> => {
    return E.gen(function* () {
      const records = yield* createConfigurationPersistenceRecords({
        configuration,
        label,
      }).pipe(E.mapError(mapConfigurationDAOError));

      const definitionInsert = yield* Schema.encodeEffect(
        ConfigurationDefinitionModel.insert,
      )(records.configurationDefinition).pipe(
        E.mapError(mapConfigurationDAOError),
      );

      const configurationInsert = yield* Schema.encodeEffect(
        ConfigurationModel.insert,
      )(records.configuration).pipe(E.mapError(mapConfigurationDAOError));

      const requirementInserts = yield* E.forEach(
        records.requirements,
        (requirement) => {
          return Schema.encodeEffect(RequirementModel.insert)(requirement);
        },
      ).pipe(E.mapError(mapConfigurationDAOError));

      const milestoneInserts = yield* E.forEach(
        records.milestones,
        (milestone) => {
          return Schema.encodeEffect(MilestoneModel.insert)(milestone);
        },
      ).pipe(E.mapError(mapConfigurationDAOError));

      const milestoneRequirementInserts = yield* E.forEach(
        records.milestoneRequirements,
        (milestoneRequirement) => {
          return Schema.encodeEffect(MilestoneRequirementModel.insert)(
            milestoneRequirement,
          );
        },
      ).pipe(E.mapError(mapConfigurationDAOError));

      const configurationId = yield* sql
        .withTransaction(
          E.gen(function* () {
            if (replaceConfigurationId !== undefined) {
              const rows = yield* sql`
              SELECT id
              FROM configuration
              WHERE id = ${replaceConfigurationId}
              LIMIT 1
            `;

              if (rows[0] === undefined) {
                return yield* E.fail(
                  mapConfigurationDAOError(
                    new Error(
                      `Configuration "${replaceConfigurationId}" was not found.`,
                    ),
                  ),
                );
              }
            }

            const definitionRows = yield* sql`
            SELECT id
            FROM configuration_definition
            WHERE fingerprint = ${definitionInsert.fingerprint}
            LIMIT 1
          `;

            const existingDefinition = definitionRows[0];

            let configurationDefinitionId: ConfigurationDefinitionId;

            if (existingDefinition === undefined) {
              configurationDefinitionId = records.configurationDefinition.id;

              yield* sql`
              INSERT INTO configuration_definition (
                id,
                dungeon_id,
                dungeon_level,
                fingerprint,
                canonical_json,
                created_at,
                updated_at
              )
              VALUES (
                ${definitionInsert.id},
                ${definitionInsert.dungeonId},
                ${definitionInsert.dungeonLevel},
                ${definitionInsert.fingerprint},
                ${definitionInsert.canonicalJson},
                ${definitionInsert.createdAt},
                ${definitionInsert.updatedAt}
              )
            `;

              for (const requirement of requirementInserts) {
                yield* sql`
                INSERT INTO requirement (
                  id,
                  configuration_definition_id,
                  type,
                  target_id,
                  start_occurrence,
                  required_count,
                  created_at,
                  updated_at
                )
                VALUES (
                  ${requirement.id},
                  ${configurationDefinitionId},
                  ${requirement.type},
                  ${requirement.targetId},
                  ${requirement.startOccurrence},
                  ${requirement.requiredCount},
                  ${requirement.createdAt},
                  ${requirement.updatedAt}
                )
              `;
              }
            } else {
              configurationDefinitionId = yield* Schema.decodeUnknownEffect(
                ConfigurationDefinitionIdSchema,
              )(existingDefinition.id).pipe(
                E.mapError(mapConfigurationDAOError),
              );
            }

            const duplicateRows = yield* sql`
            SELECT id
            FROM configuration
            WHERE fingerprint = ${configurationInsert.fingerprint}
            LIMIT 1
          `;

            const duplicateConfiguration = duplicateRows[0];

            if (duplicateConfiguration !== undefined) {
              const duplicateConfigurationId =
                yield* Schema.decodeUnknownEffect(ConfigurationIdSchema)(
                  duplicateConfiguration.id,
                ).pipe(E.mapError(mapConfigurationDAOError));

              if (duplicateConfigurationId === replaceConfigurationId) {
                yield* sql`
                UPDATE configuration
                SET
                  label = ${configurationInsert.label},
                  updated_at = ${configurationInsert.updatedAt}
                WHERE id = ${duplicateConfigurationId}
              `;

                const existingMilestones =
                  yield* getMilestonesByConfigurationId(
                    duplicateConfigurationId,
                  );

                const existingRequirements =
                  yield* getRequirementsByConfigurationDefinitionId(
                    configurationDefinitionId,
                  );

                const existingMilestoneRequirements =
                  yield* getMilestoneRequirementsByMilestoneIds(
                    existingMilestones.map((milestone) => {
                      return milestone.id;
                    }),
                  );

                for (const milestoneInsert of milestoneInserts) {
                  const submittedRequirementIds = milestoneRequirementInserts
                    .filter((milestoneRequirement) => {
                      return (
                        milestoneRequirement.milestoneId === milestoneInsert.id
                      );
                    })
                    .map((milestoneRequirement) => {
                      return milestoneRequirement.requirementId;
                    });

                  const submittedRequirements = requirementInserts.filter(
                    (requirement) => {
                      return submittedRequirementIds.includes(requirement.id);
                    },
                  );

                  const submittedIdentityKey =
                    getMilestoneRequirementsIdentityKey(submittedRequirements);

                  const existingMilestone = existingMilestones.find(
                    (milestone) => {
                      const requirementIds = existingMilestoneRequirements
                        .filter((milestoneRequirement) => {
                          return (
                            milestoneRequirement.milestoneId === milestone.id
                          );
                        })
                        .map((milestoneRequirement) => {
                          return milestoneRequirement.requirementId;
                        });

                      const requirements = existingRequirements.filter(
                        (requirement) => {
                          return requirementIds.includes(requirement.id);
                        },
                      );

                      return (
                        getMilestoneRequirementsIdentityKey(requirements) ===
                        submittedIdentityKey
                      );
                    },
                  );

                  if (existingMilestone === undefined) {
                    return yield* E.fail(
                      mapConfigurationDAOError(
                        new Error(
                          `Could not match persisted milestone for configuration "${duplicateConfigurationId}".`,
                        ),
                      ),
                    );
                  }

                  yield* sql`
                  UPDATE milestone
                  SET
                    label = ${milestoneInsert.label},
                    updated_at = ${milestoneInsert.updatedAt}
                  WHERE id = ${existingMilestone.id}
                `;
                }

                return duplicateConfigurationId;
              }

              return yield* E.fail(
                mapConfigurationDAOError(
                  new Error(
                    `This matches existing configuration "${duplicateConfigurationId}".`,
                  ),
                ),
              );
            }

            const newConfigurationId = records.configuration.id;

            yield* sql`
            INSERT INTO configuration (
              id,
              configuration_definition_id,
              label,
              fingerprint,
              canonical_json,
              created_at,
              updated_at
            )
            VALUES (
              ${newConfigurationId},
              ${configurationDefinitionId},
              ${configurationInsert.label},
              ${configurationInsert.fingerprint},
              ${configurationInsert.canonicalJson},
              ${configurationInsert.createdAt},
              ${configurationInsert.updatedAt}
            )
          `;

            const persistedRequirements =
              yield* getRequirementsByConfigurationDefinitionId(
                configurationDefinitionId,
              );

            for (const milestone of milestoneInserts) {
              yield* sql`
              INSERT INTO milestone (
                id,
                configuration_id,
                label,
                created_at,
                updated_at
              )
              VALUES (
                ${milestone.id},
                ${newConfigurationId},
                ${milestone.label},
                ${milestone.createdAt},
                ${milestone.updatedAt}
              )
            `;

              const submittedMilestoneRequirements =
                milestoneRequirementInserts.filter((milestoneRequirement) => {
                  return milestoneRequirement.milestoneId === milestone.id;
                });

              for (const milestoneRequirement of submittedMilestoneRequirements) {
                const submittedRequirement = requirementInserts.find(
                  (requirement) => {
                    return (
                      requirement.id === milestoneRequirement.requirementId
                    );
                  },
                );

                if (submittedRequirement === undefined) {
                  return yield* E.fail(
                    mapConfigurationDAOError(
                      new Error(
                        `Could not resolve submitted requirement "${milestoneRequirement.requirementId}".`,
                      ),
                    ),
                  );
                }

                const requirementIdentity = getMilestoneRequirementsIdentityKey(
                  [submittedRequirement],
                );

                const persistedRequirement = persistedRequirements.find(
                  (requirement) => {
                    return (
                      getMilestoneRequirementsIdentityKey([requirement]) ===
                      requirementIdentity
                    );
                  },
                );

                if (persistedRequirement === undefined) {
                  return yield* E.fail(
                    mapConfigurationDAOError(
                      new Error(
                        `Could not resolve persisted requirement for milestone "${milestone.id}".`,
                      ),
                    ),
                  );
                }

                yield* sql`
                INSERT INTO milestone_requirement (
                  milestone_id,
                  requirement_id,
                  created_at
                )
                VALUES (
                  ${milestone.id},
                  ${persistedRequirement.id},
                  ${milestoneRequirement.createdAt}
                )
              `;
              }
            }

            if (
              replaceConfigurationId !== undefined &&
              replaceConfigurationId !== newConfigurationId
            ) {
              yield* sql`
              DELETE FROM configuration
              WHERE id = ${replaceConfigurationId}
            `;
            }

            if (replaceDungeonAndLevel) {
              yield* sql`
              DELETE FROM configuration
              WHERE id IN (
                SELECT configuration.id
                FROM configuration
                INNER JOIN configuration_definition
                  ON configuration_definition.id =
                    configuration.configuration_definition_id
                WHERE configuration_definition.dungeon_id =
                    ${definitionInsert.dungeonId}
                  AND configuration_definition.dungeon_level =
                    ${definitionInsert.dungeonLevel}
                  AND configuration.id <> ${newConfigurationId}
              )
            `;
            }

            return newConfigurationId;
          }),
        )
        .pipe(E.mapError(mapConfigurationDAOError));

      return yield* getPersistedConfiguration(configurationId);
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

  const update: ConfigurationDAOShape["update"] = ({
    configuration,
    id,
    label,
  }) => {
    return persistConfiguration({
      configuration,
      label,
      replaceConfigurationId: id,
      replaceDungeonAndLevel: false,
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
        WHERE id IN (
          SELECT configuration.id
          FROM configuration
          INNER JOIN configuration_definition
            ON configuration_definition.id =
              configuration.configuration_definition_id
          WHERE configuration_definition.dungeon_id = ${dungeonId}
            AND configuration_definition.dungeon_level = ${dungeonLevel}
        )
      `.pipe(E.asVoid, E.mapError(mapConfigurationDAOError));
    };

  return {
    delete: deleteConfiguration,
    deleteByDungeonAndLevel,
    getAll,
    getById,
    save,
    saveReplacingDungeonAndLevel,
    update,
  } satisfies ConfigurationDAOShape;
});

export const ConfigurationDAOLive = Layer.effect(ConfigurationDAO, make);
