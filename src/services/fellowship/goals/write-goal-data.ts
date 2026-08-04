import * as E from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import type * as PlatformError from "effect/PlatformError";

import { GoalDataSerializationError } from "@/errors/goal-data-serialization-error.ts";
import { type FellowshipGoalData } from "@/services/fellowship/types.ts";

export type WriteGoalDataOptions = {
  readonly filePath: string;
  readonly goal: FellowshipGoalData;
};

export type WriteGoalDataError =
  | GoalDataSerializationError
  | PlatformError.PlatformError;

function serializeGoalData({
  filePath,
  goal,
}: WriteGoalDataOptions): E.Effect<string, GoalDataSerializationError> {
  return E.try({
    catch: (cause) => {
      return new GoalDataSerializationError({
        cause,
        filePath,
      });
    },
    try: () => {
      return `${JSON.stringify(goal, null, 2)}\n`;
    },
  });
}

export function writeGoalData({
  filePath,
  goal,
}: WriteGoalDataOptions): E.Effect<
  void,
  WriteGoalDataError,
  FileSystem.FileSystem | Path.Path
> {
  return E.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const contents = yield* serializeGoalData({
      filePath,
      goal,
    });

    const directoryPath = path.dirname(filePath);

    yield* fileSystem.makeDirectory(directoryPath, {
      recursive: true,
    });

    yield* fileSystem.writeFileString(filePath, contents);
  });
}
