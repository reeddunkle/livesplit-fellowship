import * as Data from "effect/Data";

export const FELLOWSHIP_LOG_PARSE_ERROR = "FellowshipLogParseError" as const;

export class FellowshipLogParseError extends Data.TaggedError(
  FELLOWSHIP_LOG_PARSE_ERROR,
)<{
  readonly cause: unknown;
  readonly line: string;
}> {}
