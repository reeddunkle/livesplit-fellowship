import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";

import { type FellowshipLogParseError } from "@/errors/fellowship-log-parse-error.ts";
import {
  FileMonitor,
  type FileMonitorError,
} from "@/services/filesystem/file-monitor-service.ts";

import { parseFellowshipEventStream } from "./parsing/parse-fellowship-event-stream.ts";
import { type FellowshipEvent } from "./validation/fellowship-event-schema.ts";

const LIVE_LOG_POLL_INTERVAL = "250 millis";
const FELLOWSHIP_LOG_FILE_EXTENSION = ".txt";

export type FellowshipReadError =
  | FileMonitorError
  | FellowshipLogParseError
  | Config.ConfigError;

export interface FellowshipService {
  readonly liveEvents: () => Stream.Stream<
    FellowshipEvent,
    FellowshipReadError
  >;

  readonly readEvents: (
    filePath: string,
  ) => E.Effect<ReadonlyArray<FellowshipEvent>, FellowshipReadError>;

  readonly streamEvents: (
    filePath: string,
  ) => Stream.Stream<FellowshipEvent, FellowshipReadError>;
}

export class Fellowship extends Context.Service<
  Fellowship,
  FellowshipService
>()("app/Fellowship") {}

const fellowshipLogDirectoryConfig = Config.string("FELLOWSHIP_LOG_DIRECTORY");

const makeFellowshipLive = E.gen(function* () {
  const fileMonitor = yield* FileMonitor;

  const isFellowshipLogFile = (fileName: string): boolean => {
    return fileName.toLowerCase().endsWith(FELLOWSHIP_LOG_FILE_EXTENSION);
  };

  const streamEvents = (
    filePath: string,
  ): Stream.Stream<FellowshipEvent, FellowshipReadError> => {
    return parseFellowshipEventStream(
      fileMonitor.streamLines({
        filePath,
      }),
    );
  };

  const readEvents = (
    filePath: string,
  ): E.Effect<ReadonlyArray<FellowshipEvent>, FellowshipReadError> => {
    return streamEvents(filePath).pipe(Stream.runCollect);
  };

  const liveEvents = (): Stream.Stream<
    FellowshipEvent,
    FellowshipReadError | Config.ConfigError
  > => {
    return Stream.unwrap(
      E.gen(function* () {
        const logDirectoryPath = yield* fellowshipLogDirectoryConfig;

        return fileMonitor
          .streamLatestFileLines({
            directoryPath: logDirectoryPath,
            matches: isFellowshipLogFile,
            pollInterval: LIVE_LOG_POLL_INTERVAL,
            startFrom: "end",
          })
          .pipe(
            Stream.tap((line) => {
              return E.logInfo("Fellowship parser received line.", {
                length: line.length,
                preview: line.slice(0, 200),
              });
            }),
            parseFellowshipEventStream,
            Stream.tap((event) => {
              return E.logInfo("Fellowship parser emitted event.", {
                event,
                eventType: event.type,
              });
            }),
          );
      }),
    );
  };

  return {
    liveEvents,
    readEvents,
    streamEvents,
  } satisfies FellowshipService;
});

export const FellowshipLive = Layer.effect(Fellowship, makeFellowshipLive);
