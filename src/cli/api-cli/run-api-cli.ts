import { parseArgs } from "node:util";
import * as E from "effect/Effect";
import * as Match from "effect/Match";

import { toError } from "@/cli/util/to-error.ts";
import { validateNoExtraPositionals } from "@/cli/util/validate-no-extra-positionals.ts";

import { runServeApiCommand } from "./commands/serve-command.ts";

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

export function runApiCLI(args: ReadonlyArray<string>) {
  return E.gen(function* () {
    const parsedArguments = yield* parseArguments(args);
    const [commandName] = parsedArguments.positionals;

    return yield* Match.value(commandName).pipe(
      Match.when("serve", () =>
        E.gen(function* () {
          yield* validateNoExtraPositionals(parsedArguments.positionals);

          yield* runServeApiCommand;
        }),
      ),
      Match.orElse((unknownCommand) =>
        E.fail(
          new Error(`Unknown API command: ${unknownCommand ?? "(missing)"}`),
        ),
      ),
    );
  });
}
