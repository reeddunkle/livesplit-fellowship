import * as Context from "effect/Context";
import type * as Duration from "effect/Duration";
import * as E from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import type * as PlatformError from "effect/PlatformError";
import * as Stream from "effect/Stream";

import { FileNotFoundError } from "@/errors/file-not-found-error.ts";
import { getDateEpochMilliseconds } from "@/util/get-date-epoch-milliseconds.ts";

import {
  compareFiles,
  createFileReadState,
  createFileReadStateFromBeginning,
  type FileData,
  getFileId,
  isSameFile,
  type ReadAppendedLinesOptions,
  type ReadAppendedLinesResult,
  splitCompleteLines,
} from "./filesystem.ts";

export type FileMonitorError = FileNotFoundError | PlatformError.PlatformError;

type FindLatestFileOptions = {
  readonly directoryPath: string;
  readonly matches: (fileName: string) => boolean;
};

type ReadLinesOptions = {
  readonly filePath: string;
};

type StreamLinesOptions = {
  readonly filePath: string;
};

type StreamLatestFileLinesOptions = {
  readonly directoryPath: string;
  readonly matches: (fileName: string) => boolean;
  readonly pollInterval: Duration.Input;
  /**
   * "end" emits only content appended after monitoring begins.
   * "start" reads the initially selected file from byte zero.
   */
  readonly startFrom: "end" | "start";
};

export interface FileMonitorService {
  readonly findLatestFile: (
    options: FindLatestFileOptions,
  ) => E.Effect<FileData, FileMonitorError>;

  readonly readLines: (
    options: ReadLinesOptions,
  ) => E.Effect<ReadonlyArray<string>, PlatformError.PlatformError>;

  readonly streamLatestFileLines: (
    options: StreamLatestFileLinesOptions,
  ) => Stream.Stream<string, FileMonitorError>;

  readonly streamLines: (
    options: StreamLinesOptions,
  ) => Stream.Stream<string, PlatformError.PlatformError>;
}

export class FileMonitor extends Context.Service<
  FileMonitor,
  FileMonitorService
>()("app/FileMonitor") {}

type ReadFileRangeOptions = {
  readonly bytesToRead: FileSystem.Size;
  readonly filePath: string;
  readonly offset: FileSystem.Size;
};

type DecodeChunksOptions = {
  readonly chunks: ReadonlyArray<Uint8Array>;
  readonly decoder: TextDecoder;
};

const makeFileMonitor = E.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const findLatestFile = ({
    directoryPath,
    matches,
  }: FindLatestFileOptions): E.Effect<FileData, FileMonitorError> => {
    return E.gen(function* () {
      const entries = yield* fileSystem.readDirectory(directoryPath);

      const candidates = yield* E.forEach(entries, (entry) => {
        return E.gen(function* () {
          if (!matches(entry)) {
            return undefined;
          }

          const filePath = path.join(directoryPath, entry);
          const info = yield* fileSystem.stat(filePath);

          if (info.type !== "File") {
            return undefined;
          }

          return {
            createdAtEpochMilliseconds: getDateEpochMilliseconds(
              info.birthtime,
            ),
            fileId: getFileId({
              filePath,
              info,
            }),
            filePath,
            modifiedAtEpochMilliseconds: getDateEpochMilliseconds(info.mtime),
            size: info.size,
          } satisfies FileData;
        });
      });

      const latestFile = candidates
        .filter((candidate): candidate is FileData => {
          return candidate !== undefined;
        })
        .toSorted(compareFiles)
        .at(0);

      if (latestFile === undefined) {
        return yield* new FileNotFoundError({
          directoryPath,
        });
      }

      return latestFile;
    });
  };

  const waitForLatestFile = ({
    directoryPath,
    matches,
    pollInterval,
  }: FindLatestFileOptions & {
    readonly pollInterval: Duration.Input;
  }): E.Effect<FileData, PlatformError.PlatformError> => {
    return findLatestFile({
      directoryPath,
      matches,
    }).pipe(
      E.catchTag("FileNotFoundError", () => {
        return E.gen(function* () {
          yield* E.logInfo("Waiting for a matching file.", {
            directoryPath,
          });

          yield* E.sleep(pollInterval);

          return yield* waitForLatestFile({
            directoryPath,
            matches,
            pollInterval,
          });
        });
      }),
    );
  };

  const readFileRange = ({
    bytesToRead,
    filePath,
    offset,
  }: ReadFileRangeOptions): E.Effect<
    ReadonlyArray<Uint8Array>,
    PlatformError.PlatformError
  > => {
    return fileSystem
      .stream(filePath, {
        bytesToRead,
        offset,
      })
      .pipe(Stream.runCollect);
  };

  const decodeChunks = ({ chunks, decoder }: DecodeChunksOptions): string => {
    return chunks
      .map((chunk) => {
        return decoder.decode(chunk, {
          stream: true,
        });
      })
      .join("");
  };

  const readAppendedLines = ({
    file,
    state,
  }: ReadAppendedLinesOptions): E.Effect<
    ReadAppendedLinesResult,
    PlatformError.PlatformError
  > => {
    return E.gen(function* () {
      /*
       * A new latest file was selected. Read it from byte zero so content
       * written before this polling cycle is not missed.
       */
      if (!isSameFile(file, state.file)) {
        return yield* readAppendedLines({
          file,
          state: createFileReadStateFromBeginning(file),
        });
      }

      /*
       * The selected file was truncated or replaced.
       */
      if (file.size < state.byteOffset) {
        return yield* readAppendedLines({
          file,
          state: createFileReadStateFromBeginning(file),
        });
      }

      const bytesToRead = FileSystem.Size(file.size - state.byteOffset);

      if (bytesToRead === FileSystem.Size(0)) {
        return {
          lines: [],
          state: {
            ...state,
            file,
          },
        };
      }

      const chunks = yield* readFileRange({
        bytesToRead,
        filePath: file.filePath,
        offset: state.byteOffset,
      });

      const bytesRead = chunks.reduce((total, chunk) => {
        return total + BigInt(chunk.byteLength);
      }, BigInt(0));

      const appendedText = decodeChunks({
        chunks,
        decoder: state.decoder,
      });

      const splitResult = splitCompleteLines({
        incompleteLine: state.incompleteLine,
        text: appendedText,
      });

      return {
        lines: splitResult.lines,
        state: {
          byteOffset: FileSystem.Size(state.byteOffset + bytesRead),
          decoder: state.decoder,
          file,
          incompleteLine: splitResult.incompleteLine,
        },
      };
    });
  };

  const streamLines = ({
    filePath,
  }: StreamLinesOptions): Stream.Stream<
    string,
    PlatformError.PlatformError
  > => {
    return fileSystem.stream(filePath).pipe(
      Stream.decodeText,
      Stream.splitLines,
      Stream.filter((line) => line.length > 0),
    );
  };

  const readLines = ({
    filePath,
  }: ReadLinesOptions): E.Effect<
    ReadonlyArray<string>,
    PlatformError.PlatformError
  > => {
    return streamLines({
      filePath,
    }).pipe(Stream.runCollect);
  };

  const streamLatestFileLines = ({
    directoryPath,
    matches,
    pollInterval,
    startFrom,
  }: StreamLatestFileLinesOptions): Stream.Stream<string, FileMonitorError> => {
    return Stream.unwrap(
      E.gen(function* () {
        const initialFile = yield* waitForLatestFile({
          directoryPath,
          matches,
          pollInterval,
        });

        const initialState = createFileReadState({
          byteOffset:
            startFrom === "end" ? initialFile.size : FileSystem.Size(0),
          file: initialFile,
        });

        return Stream.tick(pollInterval).pipe(
          Stream.mapAccumEffect(
            () => initialState,
            (state) => {
              return E.gen(function* () {
                const latestFile = yield* waitForLatestFile({
                  directoryPath,
                  matches,
                  pollInterval,
                });

                const result = yield* readAppendedLines({
                  file: latestFile,
                  state,
                });

                return [result.state, result.lines] as const;
              });
            },
          ),
        );
      }),
    );
  };

  return {
    findLatestFile,
    readLines,
    streamLatestFileLines,
    streamLines,
  } satisfies FileMonitorService;
});

export const FileMonitorLive = Layer.effect(FileMonitor, makeFileMonitor);
