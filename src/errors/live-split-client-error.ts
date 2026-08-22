import * as Data from "effect/Data";

export const INVALID_LIVE_SPLIT_RESPONSE_ERROR =
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

export const LIVE_SPLIT_CLIENT_UNAVAILABLE_ERROR =
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
