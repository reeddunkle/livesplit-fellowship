import * as Data from "effect/Data";

export type ConfigurationStoreErrorDetails =
  | {
      readonly _tag: "DuplicateConfiguration";
      readonly fingerprint: string;
    }
  | {
      readonly _tag: "Unexpected";
      readonly cause: unknown;
    };

export const CONFIGURATION_STORE_ERROR = "ConfigurationStoreError" as const;

export class ConfigurationStoreError extends Data.TaggedError(
  CONFIGURATION_STORE_ERROR,
)<{
  readonly details: ConfigurationStoreErrorDetails;
}> {}
