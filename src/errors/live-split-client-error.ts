import * as Data from "effect/Data";

const INVALID_LIVE_SPLIT_RESPONSE_ERROR =
  "InvalidLiveSplitResponseError" as const;

export class InvalidLiveSplitResponseError extends Data.TaggedError(
  INVALID_LIVE_SPLIT_RESPONSE_ERROR,
)<{
  readonly command: string;
  readonly response: string;
}> {
  override get message(): string {
    return (
      `LiveSplit returned an invalid response for "${this.command}": ` +
      `"${this.response}".`
    );
  }
}

const LIVE_SPLIT_CLIENT_UNAVAILABLE_ERROR =
  "LiveSplitClientUnavailableError" as const;

export class LiveSplitClientUnavailableError extends Data.TaggedError(
  LIVE_SPLIT_CLIENT_UNAVAILABLE_ERROR,
)<{
  readonly reason: string;
}> {
  override get message(): string {
    return `The LiveSplit client is unavailable: ${this.reason}.`;
  }
}

const LIVE_SPLIT_CONNECTION_ERROR = "LiveSplitConnectionError" as const;

export class LiveSplitConnectionError extends Data.TaggedError(
  LIVE_SPLIT_CONNECTION_ERROR,
)<{
  readonly cause: unknown;
}> {
  override get message(): string {
    return "Failed to connect to LiveSplit.";
  }
}
