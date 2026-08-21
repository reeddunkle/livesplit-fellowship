import * as Data from "effect/Data";

export class MilestoneConfigurationJsonError extends Data.TaggedError(
  "MilestoneConfigurationJsonError",
)<{
  readonly cause: unknown;
  readonly filePath: string;
}> {}

class UnknownFellowshipDungeonError extends Data.TaggedError(
  "UnknownFellowshipDungeonError",
)<{
  readonly dungeonKey: string;
  readonly filePath: string;
}> {}
