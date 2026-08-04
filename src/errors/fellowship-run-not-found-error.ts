import * as Data from "effect/Data";

export class FellowshipRunNotFoundError extends Data.TaggedError(
  "FellowshipRunNotFoundError",
)<{
  readonly dungeonName: string;
  readonly keyLevel?: number;
  readonly logFilePath: string;
}> {
  override get message(): string {
    const runDescription =
      this.keyLevel === undefined
        ? this.dungeonName
        : `${this.dungeonName} +${this.keyLevel}`;

    return (
      `No completed ${runDescription} run was found ` +
      `in "${this.logFilePath}".`
    );
  }
}
