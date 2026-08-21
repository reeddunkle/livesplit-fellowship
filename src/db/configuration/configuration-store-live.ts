import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import {
  createConfigurationPersistenceRecords,
  createPersistedConfiguration,
} from "@/db/configuration/configuration-persistence.ts";
import {
  ConfigurationStore,
  type ConfigurationStoreShape,
  type PersistedConfiguration,
} from "@/db/configuration/configuration-store.ts";
import {
  type ConfigurationId,
  ConfigurationModel,
} from "@/db/models/configuration-model.ts";
import {
  type MilestoneId,
  MilestoneModel,
} from "@/db/models/milestone-model.ts";
import { RequirementModel } from "@/db/models/requirement-model.ts";
import { ConfigurationStoreError } from "@/errors/configuration-store-error.ts";

function mapConfigurationStoreError(cause: unknown): ConfigurationStoreError {
  if (cause instanceof ConfigurationStoreError) {
    return cause;
  }

  return new ConfigurationStoreError({
    details: {
      _tag: "Unexpected",
      cause,
    },
  });
}

function duplicateConfigurationError(
  fingerprint: string,
): ConfigurationStoreError {
  return new ConfigurationStoreError({
    details: {
      _tag: "DuplicateConfiguration",
      fingerprint,
    },
  });
}

function decodeConfigurationRows(
  rows: unknown,
): E.Effect<ReadonlyArray<ConfigurationModel>, ConfigurationStoreError> {
  return Schema.decodeUnknownEffect(Schema.Array(ConfigurationModel))(
    rows,
  ).pipe(E.mapError(mapConfigurationStoreError));
}

function decodeMilestoneRows(
  rows: unknown,
): E.Effect<ReadonlyArray<MilestoneModel>, ConfigurationStoreError> {
  return Schema.decodeUnknownEffect(Schema.Array(MilestoneModel))(rows).pipe(
    E.mapError(mapConfigurationStoreError),
  );
}

function decodeRequirementRows(
  rows: unknown,
): E.Effect<ReadonlyArray<RequirementModel>, ConfigurationStoreError> {
  return Schema.decodeUnknownEffect(Schema.Array(RequirementModel))(rows).pipe(
    E.mapError(mapConfigurationStoreError),
  );
}

const make = E.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const getMilestonesByConfigurationId = (
    configurationId: ConfigurationId,
  ): E.Effect<ReadonlyArray<MilestoneModel>, ConfigurationStoreError> => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          id,
          configuration_id,
          label
        FROM milestones
        WHERE configuration_id = ${configurationId}
      `;

      return yield* decodeMilestoneRows(rows);
    }).pipe(E.mapError(mapConfigurationStoreError));
  };

  const getRequirementsByMilestoneIds = (
    milestoneIds: ReadonlyArray<MilestoneId>,
  ): E.Effect<ReadonlyArray<RequirementModel>, ConfigurationStoreError> => {
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
        FROM requirements
        WHERE milestone_id IN ${sql.in(milestoneIds)}
      `;

      return yield* decodeRequirementRows(rows);
    }).pipe(E.mapError(mapConfigurationStoreError));
  };

  const hydrateConfiguration = (
    configuration: ConfigurationModel,
  ): E.Effect<PersistedConfiguration, ConfigurationStoreError> => {
    return E.gen(function* () {
      const milestones = yield* getMilestonesByConfigurationId(
        configuration.id,
      );

      const requirements = yield* getRequirementsByMilestoneIds(
        milestones.map((milestone) => milestone.id),
      );

      return yield* E.try({
        catch: mapConfigurationStoreError,
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

  const create: ConfigurationStoreShape["create"] = ({ configuration }) => {
    return E.gen(function* () {
      const records = yield* E.try({
        catch: mapConfigurationStoreError,
        try: () => {
          return createConfigurationPersistenceRecords({
            configuration,
          });
        },
      });

      const configurationInsert = yield* Schema.encodeEffect(
        ConfigurationModel.insert,
      )(records.configuration).pipe(E.mapError(mapConfigurationStoreError));

      const milestoneInserts = yield* E.forEach(
        records.milestones,
        (milestone) => {
          return Schema.encodeEffect(MilestoneModel.insert)(milestone);
        },
      ).pipe(E.mapError(mapConfigurationStoreError));

      const requirementInserts = yield* E.forEach(
        records.requirements,
        (requirement) => {
          return Schema.encodeEffect(RequirementModel.insert)(requirement);
        },
      ).pipe(E.mapError(mapConfigurationStoreError));

      yield* sql
        .withTransaction(
          E.gen(function* () {
            const existingConfigurations = yield* sql`
              SELECT id
              FROM configurations
              WHERE fingerprint = ${configurationInsert.fingerprint}
              LIMIT 1
            `;

            if (existingConfigurations.length > 0) {
              yield* E.fail(
                duplicateConfigurationError(configurationInsert.fingerprint),
              );
            }

            yield* sql`
              INSERT INTO configurations (
                id,
                dungeon_key,
                fingerprint,
                canonical_json,
                created_at_milliseconds
              )
              VALUES (
                ${configurationInsert.id},
                ${configurationInsert.dungeonKey},
                ${configurationInsert.fingerprint},
                ${configurationInsert.canonicalJson},
                ${configurationInsert.createdAt}
              )
            `;

            for (const milestone of milestoneInserts) {
              yield* sql`
                INSERT INTO milestones (
                  id,
                  configuration_id,
                  label
                )
                VALUES (
                  ${milestone.id},
                  ${milestone.configurationId},
                  ${milestone.label}
                )
              `;
            }

            for (const requirement of requirementInserts) {
              yield* sql`
                INSERT INTO requirements (
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
          }),
        )
        .pipe(E.mapError(mapConfigurationStoreError));

      return {
        configuration,
        id: records.configuration.id,
      };
    });
  };

  const getById: ConfigurationStoreShape["getById"] = ({ id }) => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          id,
          dungeon_key,
          fingerprint,
          canonical_json,
          created_at_milliseconds AS created_at
        FROM configurations
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
    }).pipe(E.mapError(mapConfigurationStoreError));
  };

  const getAll: ConfigurationStoreShape["getAll"] = () => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          id,
          dungeon_key,
          fingerprint,
          canonical_json,
          created_at_milliseconds AS created_at
        FROM configurations
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
    }).pipe(E.mapError(mapConfigurationStoreError));
  };

  const deleteConfiguration: ConfigurationStoreShape["delete"] = ({ id }) => {
    return sql`
      DELETE FROM configurations
      WHERE id = ${id}
    `.pipe(E.asVoid, E.mapError(mapConfigurationStoreError));
  };

  return {
    create,
    delete: deleteConfiguration,
    getAll,
    getById,
  } satisfies ConfigurationStoreShape;
});

export const ConfigurationStoreLive = Layer.effect(ConfigurationStore, make);
