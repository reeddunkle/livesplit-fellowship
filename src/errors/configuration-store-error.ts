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

export class ConfigurationStoreError extends Data.TaggedError(
  "ConfigurationStoreError",
)<{
  readonly details: ConfigurationStoreErrorDetails;
}> {}
