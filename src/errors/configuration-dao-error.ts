import * as Data from "effect/Data";

export type ConfigurationDAOErrorDetails =
  | {
      readonly _tag: "DuplicateConfiguration";
      readonly fingerprint: string;
    }
  | {
      readonly _tag: "Unexpected";
      readonly cause: unknown;
    };

const CONFIGURATION_DAO_ERROR = "ConfigurationDAOError" as const;

export class ConfigurationDAOError extends Data.TaggedError(
  CONFIGURATION_DAO_ERROR,
)<{
  readonly details: ConfigurationDAOErrorDetails;
}> {}
