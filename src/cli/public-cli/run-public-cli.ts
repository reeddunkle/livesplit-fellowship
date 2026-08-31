import { parseArgs } from "node:util";
import * as E from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";
import * as Match from "effect/Match";
import type * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { type FellowshipTracker } from "@/application/tracking/fellowship-tracker-service.ts";
import {
  AutosplitCommandInputSchema,
  runAutosplitCommand,
} from "@/cli/public-cli/commands/autosplit-command.ts";
import {
  FilterLogCommandInputSchema,
  runFilterLogCommand,
} from "@/cli/public-cli/commands/filter-log-command.ts";
import {
  GenerateLSSCommandInputSchema,
  runGenerateLSSCommand,
} from "@/cli/public-cli/commands/generate-lss-command.ts";
import {
  runSplitLogCommand,
  SplitLogCommandInputSchema,
} from "@/cli/public-cli/commands/split-log-command.ts";
import { toError } from "@/cli/util/to-error.ts";
import { validateNoExtraPositionals } from "@/cli/util/validate-no-extra-positionals.ts";
import { type DungeonDAO } from "@/db/daos/dungeon/dungeon-dao.ts";
import { type Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { type LiveSplit } from "@/services/live-split/core/live-split-service.ts";
import { type LiveSplitFile } from "@/services/live-split/files/live-split-file-service.ts";

type CLIEnvironment =
  | DungeonDAO
  | Fellowship
  | FellowshipTracker
  | FileSystem.FileSystem
  | LiveSplit
  | LiveSplitFile
  | Path.Path;

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

function parseAutosplitInput({ positionals, values }: ParsedArguments) {
  return E.gen(function* () {
    yield* validateNoExtraPositionals(positionals);

    return yield* Schema.decodeUnknownEffect(AutosplitCommandInputSchema)({
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

export function runCLI(
  args: ReadonlyArray<string>,
): E.Effect<void, unknown, CLIEnvironment> {
  return E.gen(function* () {
    const parsedArguments = yield* parseArguments(args);
    const [commandName] = parsedArguments.positionals;

    return yield* Match.value(commandName).pipe(
      Match.when("autosplit", () =>
        E.gen(function* () {
          const input = yield* parseAutosplitInput(parsedArguments);

          yield* runAutosplitCommand(input);
        }),
      ),
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
        E.fail(new Error(`Unknown command: ${unknownCommand ?? "(missing)"}`)),
      ),
    );
  });
}
