import * as E from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Logger from "effect/Logger";

const LOG_DIRECTORY = "./logs";

function getLogFileName(): string {
  const date = new Date().toISOString().slice(0, 10);

  return `${LOG_DIRECTORY}/${date}-livesplit-fellowship.log`;
}

const FileLogger = E.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;

  yield* fileSystem.makeDirectory(LOG_DIRECTORY, {
    recursive: true,
  });

  return yield* Logger.toFile(Logger.formatJson, getLogFileName());
});

export const AppLoggerLive = Logger.layer([Logger.consolePretty(), FileLogger]);
