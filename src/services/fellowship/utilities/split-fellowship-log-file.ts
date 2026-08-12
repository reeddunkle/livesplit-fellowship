import * as A from "effect/Array";
import * as E from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import type * as PlatformError from "effect/PlatformError";
import * as Stream from "effect/Stream";

import { type FellowshipLogParseError } from "@/errors/fellowship-log-parse-error.ts";
import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { parseFellowshipEventStream } from "@/services/fellowship/parsing/parse-fellowship-event-stream.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

import { isDungeonExitEvent } from "./is-dungeon-exit-event.ts";

export type SplitFellowshipLogFileOptions = {
  readonly inputFilePath: string;
  readonly outputDirectoryPath: string;
};

export type SplitFellowshipLogFileError =
  | FellowshipLogParseError
  | PlatformError.PlatformError;

type SplitFellowshipLogFileOutput = {
  readonly dungeonId: number;
  readonly dungeonName: string;
  readonly filePath: string;
  readonly isComplete: boolean;
  readonly retainedLineCount: number;
};

export type SplitFellowshipLogFileResult = {
  readonly attemptCount: number;
  readonly outputs: ReadonlyArray<SplitFellowshipLogFileOutput>;
  readonly totalLineCount: number;
};

type InspectedLogLine = {
  readonly event: FellowshipEvent | undefined;
  readonly line: string;
};

type DungeonRunAttempt = {
  readonly isComplete: boolean;
  readonly lines: ReadonlyArray<string>;
  readonly start: DungeonStartEvent;
};

type MutableDungeonRunAttempt = {
  readonly lines: string[];
  readonly start: DungeonStartEvent;
};

function inspectLogLine(
  line: string,
): E.Effect<InspectedLogLine, FellowshipLogParseError> {
  return parseFellowshipEventStream(Stream.make(line)).pipe(
    Stream.runCollect,
    E.map((events) => {
      const [event] = A.fromIterable(events);

      return {
        event,
        line,
      };
    }),
  );
}

function createDungeonSlug(dungeonName: string): string {
  return dungeonName
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function createAttempt({
  line,
  start,
}: {
  readonly line: string;
  readonly start: DungeonStartEvent;
}): MutableDungeonRunAttempt {
  return {
    lines: [line],
    start,
  };
}

function completeAttempt({
  attempt,
  isComplete,
}: {
  readonly attempt: MutableDungeonRunAttempt;
  readonly isComplete: boolean;
}): DungeonRunAttempt {
  return {
    isComplete,
    lines: attempt.lines,
    start: attempt.start,
  };
}

type SplitRunAttemptsState = {
  readonly attempts: DungeonRunAttempt[];
  readonly currentAttempt: MutableDungeonRunAttempt | undefined;
};

function splitRunAttempts(
  inspectedLines: ReadonlyArray<InspectedLogLine>,
): ReadonlyArray<DungeonRunAttempt> {
  const initialState: SplitRunAttemptsState = {
    attempts: [],
    currentAttempt: undefined,
  };

  const state = inspectedLines.reduce<SplitRunAttemptsState>(
    (state, { event, line }) => {
      if (!event) {
        return state;
      }

      if (event.type === FELLOWSHIP_EVENT.DUNGEON_START) {
        const attempts = state.currentAttempt
          ? [
              ...state.attempts,
              completeAttempt({
                attempt: state.currentAttempt,
                isComplete: false,
              }),
            ]
          : state.attempts;

        return {
          attempts,
          currentAttempt: createAttempt({
            line,
            start: event,
          }),
        };
      }

      if (!state.currentAttempt) {
        return state;
      }

      if (
        isDungeonExitEvent({
          event,
          runStart: state.currentAttempt.start,
        })
      ) {
        return {
          attempts: [
            ...state.attempts,
            completeAttempt({
              attempt: state.currentAttempt,
              isComplete: false,
            }),
          ],
          currentAttempt: undefined,
        };
      }

      state.currentAttempt.lines.push(line);

      if (
        event.type === FELLOWSHIP_EVENT.DUNGEON_END &&
        event.dungeonId === state.currentAttempt.start.dungeonId
      ) {
        return {
          attempts: [
            ...state.attempts,
            completeAttempt({
              attempt: state.currentAttempt,
              isComplete: true,
            }),
          ],
          currentAttempt: undefined,
        };
      }

      return state;
    },
    initialState,
  );

  if (!state.currentAttempt) {
    return state.attempts;
  }

  return [
    ...state.attempts,
    completeAttempt({
      attempt: state.currentAttempt,
      isComplete: false,
    }),
  ];
}

export function splitFellowshipLogFile({
  inputFilePath,
  outputDirectoryPath,
}: SplitFellowshipLogFileOptions): E.Effect<
  SplitFellowshipLogFileResult,
  SplitFellowshipLogFileError,
  FileSystem.FileSystem | Path.Path
> {
  return E.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const inspectedLines = yield* fileSystem
      .stream(inputFilePath)
      .pipe(
        Stream.decodeText,
        Stream.splitLines,
        Stream.mapEffect(inspectLogLine),
        Stream.runCollect,
      );

    const attempts = splitRunAttempts(inspectedLines);

    yield* fileSystem.makeDirectory(outputDirectoryPath, {
      recursive: true,
    });

    const dungeonAttemptCounts = new Map<number, number>();

    const outputs: SplitFellowshipLogFileOutput[] = [];

    for (const attempt of attempts) {
      const previousAttemptCount =
        dungeonAttemptCounts.get(attempt.start.dungeonId) ?? 0;

      const attemptNumber = previousAttemptCount + 1;

      dungeonAttemptCounts.set(attempt.start.dungeonId, attemptNumber);

      const dungeonSlug = createDungeonSlug(attempt.start.dungeonName);

      const attemptSuffix = String(attemptNumber).padStart(2, "0");

      const fileName = `${dungeonSlug}-attempt-${attemptSuffix}.txt`;

      const filePath = path.join(outputDirectoryPath, fileName);

      const contents =
        attempt.lines.length === 0 ? "" : `${attempt.lines.join("\n")}\n`;

      yield* fileSystem.writeFileString(filePath, contents);

      outputs.push({
        dungeonId: attempt.start.dungeonId,
        dungeonName: attempt.start.dungeonName,
        filePath,
        isComplete: attempt.isComplete,
        retainedLineCount: attempt.lines.length,
      });
    }

    return {
      attemptCount: attempts.length,
      outputs,
      totalLineCount: inspectedLines.length,
    };
  });
}
