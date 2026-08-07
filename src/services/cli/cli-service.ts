import { parseArgs } from "node:util";
import * as Context from "effect/Context";
import * as E from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import type * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { type Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { type LiveSplitFile } from "@/services/live-split/files/live-split-file-service.ts";

import {
  FilterLogCommandInputSchema,
  runFilterLogCommand,
} from "./commands/filter-log-command.ts";
import {
  GenerateLSSCommandInputSchema,
  runGenerateLSSCommand,
} from "./commands/generate-lss-command.ts";
import {
  LiveLogCommandInputSchema,
  runLiveLogCommand,
} from "./commands/live-log-command.ts";
import {
  ReplayLogCommandInputSchema,
  runReplayLogCommand,
} from "./commands/replay-log-command.ts";
import { validateNoExtraPositionals } from "./util/util.ts";

type CLIEnvironment =
  | FileSystem.FileSystem
  | Fellowship
  | Path.Path
  | LiveSplitFile;

export interface CLIService {
  readonly run: (
    args: ReadonlyArray<string>,
  ) => E.Effect<void, unknown, CLIEnvironment>;
}

export class CLI extends Context.Service<CLI, CLIService>()("app/CLI") {}

function toError(cause: unknown): Error {
  return cause instanceof Error
    ? cause
    : new Error("An unknown CLI parsing error occurred.", {
        cause,
      });
}

type ParsedArguments = ReturnType<typeof parseArgs>;

function parseArguments(
  args: ReadonlyArray<string>,
): E.Effect<ParsedArguments, Error> {
  return E.try({
    catch: toError,
    try: () => {
      return parseArgs({
        allowPositionals: true,
        args: [...args],
        options: {
          configuration: {
            short: "c",
            type: "string",
          },
          log: {
            short: "l",
            type: "string",
          },
          output: {
            short: "o",
            type: "string",
          },
        },
        strict: true,
      });
    },
  });
}

function parseLiveLogInput({ positionals, values }: ParsedArguments) {
  return E.gen(function* () {
    yield* validateNoExtraPositionals(positionals);

    return yield* Schema.decodeUnknownEffect(LiveLogCommandInputSchema)({
      configurationFilePath: values.configuration,
    });
  });
}

function parseFilterLogInput({ positionals, values }: ParsedArguments) {
  return E.gen(function* () {
    yield* validateNoExtraPositionals(positionals);

    return yield* Schema.decodeUnknownEffect(FilterLogCommandInputSchema)({
      inputFilePath: values.log,
      outputFilePath: values.output,
    });
  });
}

function parseGenerateLSSInput({ positionals, values }: ParsedArguments) {
  return E.gen(function* () {
    yield* validateNoExtraPositionals(positionals);

    return yield* Schema.decodeUnknownEffect(GenerateLSSCommandInputSchema)({
      configurationFilePath: values.configuration,
      outputFilePath: values.output,
    });
  });
}

function parseReplayLogInput({ positionals, values }: ParsedArguments) {
  return E.gen(function* () {
    yield* validateNoExtraPositionals(positionals);

    return yield* Schema.decodeUnknownEffect(ReplayLogCommandInputSchema)({
      configurationFilePath: values.configuration,
      logFilePath: values.log,
    });
  });
}

function makeCLILive(): CLIService {
  return {
    run: (args): E.Effect<void, unknown, CLIEnvironment> => {
      return E.gen(function* () {
        const parsedArguments = yield* parseArguments(args);
        const [commandName] = parsedArguments.positionals;

        switch (commandName) {
          case "filter-log": {
            const input = yield* parseFilterLogInput(parsedArguments);

            yield* runFilterLogCommand(input);
            return;
          }

          case "generate-lss": {
            const input = yield* parseGenerateLSSInput(parsedArguments);

            return yield* runGenerateLSSCommand(input);
          }

          case "live-log": {
            const input = yield* parseLiveLogInput(parsedArguments);

            return yield* runLiveLogCommand(input);
          }

          case "replay-log": {
            const input = yield* parseReplayLogInput(parsedArguments);

            return yield* runReplayLogCommand(input);
          }

          default: {
            return yield* E.fail(
              new Error(`Unknown command: ${commandName ?? "(missing)"}`),
            );
          }
        }
      });
    },
  };
}

export const CLILive = Layer.succeed(CLI, makeCLILive());
