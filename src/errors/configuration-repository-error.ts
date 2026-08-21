import * as Data from "effect/Data";

export class ConfigurationRepositoryError extends Data.TaggedError(
  "ConfigurationRepositoryError",
)<{
  readonly cause: unknown;
}> {}
