import * as Data from "effect/Data";

export const RUN_EVENT_MESSAGE_DECODE_ERROR =
  "RunEventMessageDecodeError" as const;

export class RunEventMessageDecodeError extends Data.TaggedError(
  RUN_EVENT_MESSAGE_DECODE_ERROR,
)<{
  readonly cause: unknown;
}> {}
