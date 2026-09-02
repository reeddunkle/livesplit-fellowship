import * as DateTime from "effect/DateTime";
import * as Schema from "effect/Schema";

import { type ConfigurationApiConfiguration } from "@/services/api/configuration/configuration-api-schema.ts";
import { ConfigurationDefinitionIdSchema } from "@/validation/configuration/configuration-definition-id-schema.ts";
import { ConfigurationFingerprintSchema } from "@/validation/configuration/configuration-fingerprint-schema.ts";
import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id-schema.ts";
import { ConfigurationLabelSchema } from "@/validation/configuration/configuration-label-schema.ts";

export const MOCK_CONFIGURATION_DEFINITION_ID = Schema.decodeUnknownSync(
  ConfigurationDefinitionIdSchema,
)("0198d56c-0000-7abc-8def-1234567890ab");

export const MOCK_CONFIGURATION_ID = Schema.decodeUnknownSync(
  ConfigurationIdSchema,
)("0198d56c-1234-7abc-8def-1234567890ab");

export const MOCK_UNKNOWN_CONFIGURATION_ID = Schema.decodeUnknownSync(
  ConfigurationIdSchema,
)("0198d56c-5678-7abc-8def-1234567890ab");

export const MOCK_CONFIGURATION_FINGERPRINT = Schema.decodeUnknownSync(
  ConfigurationFingerprintSchema,
)("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");

export const MOCK_CONFIGURATION_LABEL = Schema.decodeUnknownSync(
  ConfigurationLabelSchema,
)("Everdawn Grove Route");

export const MOCK_UPDATED_CONFIGURATION_LABEL = Schema.decodeUnknownSync(
  ConfigurationLabelSchema,
)("Updated Everdawn Grove Route");

export const MOCK_DUNGEON_ID = "11";

export const MOCK_DUNGEON_LEVEL = 63;

const MOCK_CONFIGURATION_CREATED_AT = DateTime.makeUnsafe(
  "2026-01-01T00:00:00.000Z",
);

const MOCK_CONFIGURATION_UPDATED_AT = DateTime.makeUnsafe(
  "2026-01-02T00:00:00.000Z",
);

export const MOCK_CONFIGURATION = {
  createdAt: MOCK_CONFIGURATION_CREATED_AT,
  dungeonId: MOCK_DUNGEON_ID,
  dungeonLevel: MOCK_DUNGEON_LEVEL,
  fingerprint: MOCK_CONFIGURATION_FINGERPRINT,
  id: MOCK_CONFIGURATION_ID,
  label: MOCK_CONFIGURATION_LABEL,
  milestones: [
    {
      label: "Desecrator 1 Killed",
      requirements: [
        {
          requiredCount: 1,
          startOccurrence: 1,
          targetId: "42",
          type: "UNIT_DEATH",
        },
      ],
    },
  ],
  updatedAt: MOCK_CONFIGURATION_UPDATED_AT,
} satisfies ConfigurationApiConfiguration;

export const MOCK_SAVE_CONFIGURATION_REQUEST = {
  configuration: {
    dungeonId: MOCK_DUNGEON_ID,
    dungeonLevel: MOCK_DUNGEON_LEVEL,
    milestones: [
      {
        label: "Desecrator 1 Killed",
        requirements: [
          {
            requiredCount: 1,
            startOccurrence: 1,
            type: "UNIT_DEATH",
            unitTypeId: "42",
          },
        ],
      },
    ],
  },
  label: MOCK_CONFIGURATION_LABEL,
} as const;
