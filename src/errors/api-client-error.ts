import * as Data from "effect/Data";

export class ApiClientMessageDecodeError extends Data.TaggedError(
  "ApiClientMessageDecodeError",
)<{
  readonly cause: unknown;
}> {}
