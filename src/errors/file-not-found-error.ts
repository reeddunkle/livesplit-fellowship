import * as Data from "effect/Data";

export class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
  readonly directoryPath: string;
}> {}
