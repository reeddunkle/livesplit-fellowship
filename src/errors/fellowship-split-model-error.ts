import * as Data from "effect/Data";

export class MissingMilestoneError extends Data.TaggedError(
  "MissingMilestoneError",
)<{
  readonly milestoneId: string;
}> {}

export class MilestoneOrderMismatchError extends Data.TaggedError(
  "MilestoneOrderMismatchError",
)<{
  readonly currentMilestoneId: string;
  readonly currentTimeMilliseconds: number;
  readonly previousMilestoneId: string;
  readonly previousTimeMilliseconds: number;
}> {}

export type FellowshipSplitModelError =
  | MissingMilestoneError
  | MilestoneOrderMismatchError;
