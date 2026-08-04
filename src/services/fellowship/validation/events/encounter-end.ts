import { SchemaGetter } from "effect";
import * as Schema from "effect/Schema";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import {
  EncounterIdSchema,
  TimestampSchema,
} from "@/services/fellowship/validation/common.ts";
import {
  BooleanFlagSchema,
  IntegerFromStringSchema,
  JsonStringArraySchema,
} from "@/validation/common.ts";

const EncounterEndLogLineSchema = Schema.Tuple([
  Schema.DateTimeUtcFromString,
  Schema.Literal(FELLOWSHIP_EVENT.ENCOUNTER_END),
  IntegerFromStringSchema,
  JsonStringArraySchema,
  BooleanFlagSchema,
]);

const EncounterEndEventSchema = Schema.Struct({
  encounterId: EncounterIdSchema,
  encounterNames: Schema.Array(Schema.String),
  succeeded: Schema.Boolean,
  timestamp: TimestampSchema,
  type: Schema.Literal(FELLOWSHIP_EVENT.ENCOUNTER_END),
});

export const EncounterEndEventFromLogSchema = EncounterEndLogLineSchema.pipe(
  Schema.decodeTo(EncounterEndEventSchema, {
    decode: SchemaGetter.transform(
      ([timestamp, type, encounterId, encounterNames, succeeded]) => {
        return {
          encounterId,
          encounterNames,
          succeeded,
          timestamp,
          type,
        };
      },
    ),

    encode: SchemaGetter.transform((event) => {
      return [
        event.timestamp,
        event.type,
        event.encounterId,
        event.encounterNames,
        event.succeeded,
      ] as const;
    }),
  }),
);

export type EncounterEndEvent = typeof EncounterEndEventFromLogSchema.Type;
