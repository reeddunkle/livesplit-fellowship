import { parseArgs } from "node:util";
import * as Context from "effect/Context";
import * as E from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { type Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { type LiveSplitClient } from "@/services/live-split/client/live-split-client-service.ts";

import {
  AutosplitCommandInputSchema,
  runAutosplitCommand,
} from "./commands/autosplit-command.ts";

export type LiveSplitCLIEnvironment =
  | FileSystem.FileSystem
  | Fellowship
  | LiveSplitClient;

export interface LiveSplitCLIService {
  readonly run: (
    args: ReadonlyArray<string>,
  ) => E.Effect<void, unknown, LiveSplitCLIEnvironment>;
}

export class LiveSplitCLI extends Context.Service<
  LiveSplitCLI,
  LiveSplitCLIService
>()("app/LiveSplitCLI") {}

function toError(cause: unknown): Error {
  return cause instanceof Error
    ? cause
    : new Error("An unknown LiveSplit CLI parsing error occurred.", {
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
        },
        strict: true,
      });
    },
  });
}

function validateNoExtraPositionals(
  positionals: ReadonlyArray<string>,
): E.Effect<void, Error> {
  const [, ...extraPositionals] = positionals;

  if (extraPositionals.length === 0) {
    return E.void;
  }

  return E.fail(
    new Error(
      `Unexpected positional arguments: ${extraPositionals.join(", ")}`,
    ),
  );
}

function parseAutosplitInput({ positionals, values }: ParsedArguments) {
  return E.gen(function* () {
    yield* validateNoExtraPositionals(positionals);

    return yield* Schema.decodeUnknownEffect(AutosplitCommandInputSchema)({
      configurationFilePath: values.configuration,
    });
  });
}

function makeLiveSplitCLILive(): LiveSplitCLIService {
  return {
    run: (args): E.Effect<void, unknown, LiveSplitCLIEnvironment> => {
      return E.gen(function* () {
        const parsedArguments = yield* parseArguments(args);

        const [commandName] = parsedArguments.positionals;

        switch (commandName) {
          case "autosplit": {
            const input = yield* parseAutosplitInput(parsedArguments);

            return yield* runAutosplitCommand(input);
          }

          default: {
            return yield* E.fail(
              new Error(
                `Unknown LiveSplit command: ${commandName ?? "(missing)"}`,
              ),
            );
          }
        }
      });
    },
  };
}

export const LiveSplitCLILive = Layer.succeed(
  LiveSplitCLI,
  makeLiveSplitCLILive(),
);
