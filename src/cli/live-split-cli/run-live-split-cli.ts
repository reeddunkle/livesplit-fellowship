import { parseArgs } from "node:util";
import * as E from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";
import * as Match from "effect/Match";
import type * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { toError } from "@/cli/util/to-error.ts";
import { validateNoExtraPositionals } from "@/cli/util/validate-no-extra-positionals.ts";
import { type DungeonDAO } from "@/db/daos/dungeon/dungeon-dao.ts";
import { type Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { type LiveSplitClient } from "@/services/live-split/client/live-split-client-service.ts";
import { type LiveSplitFile } from "@/services/live-split/files/live-split-file-service.ts";

import {
  AutosplitCommandInputSchema,
  runAutosplitCommand,
} from "./commands/autosplit-command.ts";

type LiveSplitCLIEnvironment =
  | DungeonDAO
  | Fellowship
  | FileSystem.FileSystem
  | LiveSplitClient
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

export function runLiveSplitCLI(
  args: ReadonlyArray<string>,
): E.Effect<void, unknown, LiveSplitCLIEnvironment> {
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
      Match.orElse((unknownCommand) =>
        E.fail(
          new Error(
            `Unknown LiveSplit command: ${unknownCommand ?? "(missing)"}`,
          ),
        ),
      ),
    );
  });
}
