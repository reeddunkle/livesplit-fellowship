import * as Data from "effect/Data";

export class ApiClientConnectionError extends Data.TaggedError(
  "ApiClientConnectionError",
)<{
  readonly cause: unknown;
}> {
  override get message(): string {
    return "Failed to establish an API WebSocket client connection.";
  }
}

export class ApiMessageSerializationError extends Data.TaggedError(
  "ApiMessageSerializationError",
)<{
  readonly cause: unknown;
  readonly value: unknown;
}> {
  override get message(): string {
    return "Failed to serialize an API message.";
  }
}
