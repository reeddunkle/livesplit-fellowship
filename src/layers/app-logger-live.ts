import * as Logger from "effect/Logger";

export const AppLoggerLive = Logger.layer([
  Logger.consolePretty(),
  Logger.tracerLogger,
]);
