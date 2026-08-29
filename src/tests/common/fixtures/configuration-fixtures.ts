import * as Schema from "effect/Schema";

import { type ConfigurationApiConfiguration } from "@/services/api/configuration/configuration-api-schema.ts";
import { ConfigurationFingerprintSchema } from "@/validation/configuration/configuration-fingerprint.ts";
import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id.ts";
import { ConfigurationLabelSchema } from "@/validation/configuration/configuration-label.ts";

export const TEST_CONFIGURATION_ID = Schema.decodeUnknownSync(
  ConfigurationIdSchema,
)("0198d56c-1234-7abc-8def-1234567890ab");

export const TEST_UNKNOWN_CONFIGURATION_ID = Schema.decodeUnknownSync(
  ConfigurationIdSchema,
)("0198d56c-5678-7abc-8def-1234567890ab");

export const TEST_CONFIGURATION_FINGERPRINT = Schema.decodeUnknownSync(
  ConfigurationFingerprintSchema,
)("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");

export const TEST_CONFIGURATION_LABEL = Schema.decodeUnknownSync(
  ConfigurationLabelSchema,
)("Everdawn Grove Route");

export const TEST_UPDATED_CONFIGURATION_LABEL = "Updated Everdawn Grove Route";

export const TEST_DUNGEON_ID = "11";

export const TEST_DUNGEON_LEVEL = 63;

export const TEST_CONFIGURATION = {
  dungeonId: TEST_DUNGEON_ID,
  dungeonLevel: TEST_DUNGEON_LEVEL,
  fingerprint: TEST_CONFIGURATION_FINGERPRINT,
  id: TEST_CONFIGURATION_ID,
  label: TEST_CONFIGURATION_LABEL,
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
} satisfies ConfigurationApiConfiguration;

export const TEST_SAVE_CONFIGURATION_REQUEST = {
  configuration: {
    dungeonId: TEST_DUNGEON_ID,
    dungeonLevel: TEST_DUNGEON_LEVEL,
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
  label: TEST_CONFIGURATION_LABEL,
} as const;
