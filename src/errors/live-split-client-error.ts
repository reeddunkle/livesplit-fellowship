import * as Data from "effect/Data";

export class InvalidLiveSplitResponseError extends Data.TaggedError(
  "InvalidLiveSplitResponseError",
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

export class LiveSplitClientUnavailableError extends Data.TaggedError(
  "LiveSplitClientUnavailableError",
)<{
  readonly reason: string;
}> {
  override get message(): string {
    return `The LiveSplit client is unavailable: ${this.reason}.`;
  }
}
