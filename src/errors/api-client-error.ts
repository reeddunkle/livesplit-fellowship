import * as Data from "effect/Data";

export class ApiClientMessageDecodeError extends Data.TaggedError(
  "ApiClientMessageDecodeError",
)<{
  readonly cause: unknown;
}> {}

export class ApiClientRequestError extends Data.TaggedError(
  "ApiClientRequestError",
)<{
  readonly cause: unknown;
}> {}

export class ApiClientResponseStatusError extends Data.TaggedError(
  "ApiClientResponseStatusError",
)<{
  readonly status: number;
  readonly statusText: string;
}> {}

export class ApiClientResponseDecodeError extends Data.TaggedError(
  "ApiClientResponseDecodeError",
)<{
  readonly cause: unknown;
}> {}
