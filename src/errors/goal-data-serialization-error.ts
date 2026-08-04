import * as Data from "effect/Data";

export class GoalDataSerializationError extends Data.TaggedError(
  "GoalDataSerializationError",
)<{
  readonly cause: unknown;
  readonly filePath: string;
}> {}
