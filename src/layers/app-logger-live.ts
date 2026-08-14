import * as Logger from "effect/Logger";

function getLogFileName(): string {
  const date = new Date().toISOString().slice(0, 10);

  return `./logs/${date}-livesplit-fellowship.log`;
}

export const AppLoggerLive = Logger.layer([
  Logger.consolePretty(),
  Logger.toFile(Logger.formatJson, getLogFileName()),
]);
