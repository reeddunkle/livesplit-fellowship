import * as Data from "effect/Data";

export class FellowshipLogParseError extends Data.TaggedError(
  "FellowshipLogParseError",
)<{
  readonly cause: unknown;
  readonly line: string;
}> {}
