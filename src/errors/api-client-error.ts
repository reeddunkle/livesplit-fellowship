import * as Data from "effect/Data";

export class ApiClientMessageDecodeError extends Data.TaggedError(
  "ApiClientMessageDecodeError",
)<{
  readonly cause: unknown;
}> {}

class ApiClientRequestError extends Data.TaggedError(
  "ApiClientRequestError",
)<{
  readonly cause: unknown;
}> {}

class ApiClientResponseStatusError extends Data.TaggedError(
  "ApiClientResponseStatusError",
)<{
  readonly status: number;
  readonly statusText: string;
}> {}

class ApiClientResponseDecodeError extends Data.TaggedError(
  "ApiClientResponseDecodeError",
)<{
  readonly cause: unknown;
}> {}
