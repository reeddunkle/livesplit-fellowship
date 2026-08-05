import * as Data from "effect/Data";

export class FellowshipRunNotFoundError extends Data.TaggedError(
  "FellowshipRunNotFoundError",
)<{
  readonly dungeonName: string;
  readonly logFilePath: string;
}> {
  override get message(): string {
    const runDescription = this.dungeonName;

    return (
      `No completed ${runDescription} run was found ` +
      `in "${this.logFilePath}".`
    );
  }
}
