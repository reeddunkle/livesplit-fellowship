import { parseArgs } from "node:util";
import * as E from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";
import * as Match from "effect/Match";
import type * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import type * as SqlClient from "effect/unstable/sql/SqlClient";

import { toError } from "@/cli/util/to-error.ts";
import { validateNoExtraPositionals } from "@/cli/util/validate-no-extra-positionals.ts";

import {
  BuildMilestoneConfigurationJsonSchemaCommandInputSchema,
  runBuildMilestoneConfigurationJsonSchemaCommand,
} from "./commands/build-milestone-configuration-json-schema-command.ts";
import {
  GenerateFellowshipUnitCatalogCommandInputSchema,
  runGenerateFellowshipUnitCatalogCommand,
} from "./commands/generate-fellowship-unit-catalog-command.ts";
import {
  ReplayLogFileArgumentsSchema,
  ReplayLogFileCommandInputSchema,
  runReplayLogFileCommand,
} from "./commands/replay-log-file-command.ts";
import { runSetupDatabaseCommand } from "./commands/setup-database-command.ts";

type DevCLIEnvironment =
  | FileSystem.FileSystem
  | Path.Path
  | SqlClient.SqlClient;

type ParsedArguments = ReturnType<typeof parseArgs>;

function includeWhenDefined<Key extends string, Value>(
  key: Key,
  value: Value | undefined,
): Partial<Record<Key, Value>> {
  return value === undefined
    ? {}
    : ({
        [key]: value,
      } as Record<Key, Value>);
}

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
          "initial-delay": {
            type: "string",
          },
          input: {
            short: "i",
            type: "string",
          },
          "max-delay": {
            type: "string",
          },
          output: {
            short: "o",
            type: "string",
          },
          speed: {
            short: "s",
            type: "string",
          },
        },
        strict: true,
      });
    },
  });
}

function parseBuildMilestoneConfigurationJsonSchemaInput({
  positionals,
  values,
}: ParsedArguments) {
  return E.gen(function* () {
    yield* validateNoExtraPositionals(positionals);

    return yield* Schema.decodeUnknownEffect(
      BuildMilestoneConfigurationJsonSchemaCommandInputSchema,
    )({
      ...includeWhenDefined("outputFilePath", values.output),
    });
  });
}

function parseGenerateFellowshipUnitCatalogInput({
  positionals,
  values,
}: ParsedArguments) {
  return E.gen(function* () {
    yield* validateNoExtraPositionals(positionals);

    return yield* Schema.decodeUnknownEffect(
      GenerateFellowshipUnitCatalogCommandInputSchema,
    )({
      inputFilePath: values.input,
    });
  });
}

function parseReplayLogFileInput({ positionals, values }: ParsedArguments) {
  return E.gen(function* () {
    yield* validateNoExtraPositionals(positionals);

    const arguments_ = yield* Schema.decodeUnknownEffect(
      ReplayLogFileArgumentsSchema,
    )({
      inputFilePath: values.input,
      outputFilePath: values.output,
      ...includeWhenDefined(
        "initialDelayMilliseconds",
        values["initial-delay"],
      ),
      ...includeWhenDefined("maxDelayMilliseconds", values["max-delay"]),
      ...includeWhenDefined("speed", values.speed),
    });

    return yield* Schema.decodeUnknownEffect(ReplayLogFileCommandInputSchema)({
      initialDelayMilliseconds: arguments_.initialDelayMilliseconds ?? 1_000,
      inputFilePath: arguments_.inputFilePath,
      maxDelayMilliseconds: arguments_.maxDelayMilliseconds ?? 10_000,
      outputFilePath: arguments_.outputFilePath,
      speed: arguments_.speed ?? 1,
    });
  });
}

export function runDevCLI(
  args: ReadonlyArray<string>,
): E.Effect<void, unknown, DevCLIEnvironment> {
  return E.gen(function* () {
    const parsedArguments = yield* parseArguments(args);
    const [commandName] = parsedArguments.positionals;

    return yield* Match.value(commandName).pipe(
      Match.when("build-configuration-schema", () =>
        E.gen(function* () {
          const input =
            yield* parseBuildMilestoneConfigurationJsonSchemaInput(
              parsedArguments,
            );

          yield* runBuildMilestoneConfigurationJsonSchemaCommand(input);
        }),
      ),
      Match.when("generate-unit-catalog", () =>
        E.gen(function* () {
          const input =
            yield* parseGenerateFellowshipUnitCatalogInput(parsedArguments);

          yield* runGenerateFellowshipUnitCatalogCommand(input);
        }),
      ),
      Match.when("replay-log", () =>
        E.gen(function* () {
          const input = yield* parseReplayLogFileInput(parsedArguments);

          yield* runReplayLogFileCommand(input);
        }),
      ),
      Match.when("setup-database", () =>
        E.gen(function* () {
          yield* validateNoExtraPositionals(parsedArguments.positionals);

          yield* runSetupDatabaseCommand();
        }),
      ),
      Match.orElse((unknownCommand) =>
        E.fail(
          new Error(
            `Unknown developer command: ${unknownCommand ?? "(missing)"}`,
          ),
        ),
      ),
    );
  });
}
