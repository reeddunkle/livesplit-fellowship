import { parseArgs } from "node:util";
import * as Context from "effect/Context";
import * as E from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
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
  runSplitLogCommand,
  SplitLogCommandInputSchema,
} from "./commands/split-log-command.ts";
import { toError } from "./util/to-error.ts";
import { validateNoExtraPositionals } from "./util/validate-no-extra-positionals.ts";

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

function parseFilterLogInput({ positionals, values }: ParsedArguments) {
  return E.gen(function* () {
    yield* validateNoExtraPositionals(positionals);

    return yield* Schema.decodeUnknownEffect(FilterLogCommandInputSchema)({
      inputFilePath: values.log,
      outputFilePath: values.output,
    });
  });
}

function parseSplitLogInput({ positionals, values }: ParsedArguments) {
  return E.gen(function* () {
    yield* validateNoExtraPositionals(positionals);

    return yield* Schema.decodeUnknownEffect(SplitLogCommandInputSchema)({
      inputFilePath: values.log,
      outputDirectoryPath: values.output,
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

function makeCLILive(): CLIService {
  return {
    run: (args): E.Effect<void, unknown, CLIEnvironment> => {
      return E.gen(function* () {
        const parsedArguments = yield* parseArguments(args);
        const [commandName] = parsedArguments.positionals;

        return yield* Match.value(commandName).pipe(
          Match.when("filter-log", () =>
            E.gen(function* () {
              const input = yield* parseFilterLogInput(parsedArguments);

              yield* runFilterLogCommand(input);
            }),
          ),
          Match.when("split-log", () =>
            E.gen(function* () {
              const input = yield* parseSplitLogInput(parsedArguments);

              yield* runSplitLogCommand(input);
            }),
          ),
          Match.when("generate-lss", () =>
            E.gen(function* () {
              const input = yield* parseGenerateLSSInput(parsedArguments);

              yield* runGenerateLSSCommand(input);
            }),
          ),
          Match.orElse((unknownCommand) =>
            E.fail(
              new Error(`Unknown command: ${unknownCommand ?? "(missing)"}`),
            ),
          ),
        );
      });
    },
  };
}

export const CLILive = Layer.succeed(CLI, makeCLILive());
