import { parseArgs } from "node:util";
import * as E from "effect/Effect";
import * as Match from "effect/Match";
import * as Schema from "effect/Schema";

import {
  runTrackApiCommand,
  TrackApiCommandInputSchema,
} from "./commands/track-api-command.ts";
import { toError } from "./util/to-error.ts";
import { validateNoExtraPositionals } from "./util/validate-no-extra-positionals.ts";

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

function parseTrackInput({ positionals, values }: ParsedArguments) {
  return E.gen(function* () {
    yield* validateNoExtraPositionals(positionals);

    return yield* Schema.decodeUnknownEffect(TrackApiCommandInputSchema)({
      configurationFilePath: values.configuration,
    });
  });
}

export function runApiCLI(args: ReadonlyArray<string>) {
  return E.gen(function* () {
    const parsedArguments = yield* parseArguments(args);
    const [commandName] = parsedArguments.positionals;

    return yield* Match.value(commandName).pipe(
      Match.when("track", () =>
        E.gen(function* () {
          const input = yield* parseTrackInput(parsedArguments);

          yield* runTrackApiCommand(input);
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
