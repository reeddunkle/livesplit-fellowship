import * as Data from "effect/Data";

export class ConfigurationStoreError extends Data.TaggedError(
  "ConfigurationStoreError",
)<{
  readonly cause: unknown;
}> {}
