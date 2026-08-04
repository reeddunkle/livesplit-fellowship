import { parseArgs } from "node:util";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import * as E from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { NonEmptyStringSchema } from "@/validation/common.ts";

type ReplayLogOptions = {
  readonly initialDelayMilliseconds: number;
  readonly inputFilePath: string;
  readonly maxDelayMilliseconds: number;
  readonly outputFilePath: string;
  readonly speed: number;
};

const ReplayLogArgumentsSchema = Schema.Struct({
  initialDelay: Schema.optionalKey(Schema.String),
  inputFilePath: NonEmptyStringSchema,
  maxDelay: Schema.optionalKey(Schema.String),
  outputFilePath: NonEmptyStringSchema,
  speed: Schema.optionalKey(Schema.String),
});

function toError(cause: unknown): Error {
  return cause instanceof Error
    ? cause
    : new Error("An unknown argument parsing error occurred.", {
        cause,
      });
}

function parseNonNegativeNumber({
  fallback,
  name,
  value,
}: {
  readonly fallback: number;
  readonly name: string;
  readonly value: string | undefined;
}): E.Effect<number, Error> {
  if (value === undefined) {
    return E.succeed(fallback);
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return E.fail(
      new Error(
        `"${name}" must be a non-negative number. Received "${value}".`,
      ),
    );
  }

  return E.succeed(parsedValue);
}

function parsePositiveNumber({
  fallback,
  name,
  value,
}: {
  readonly fallback: number;
  readonly name: string;
  readonly value: string | undefined;
}): E.Effect<number, Error> {
  return parseNonNegativeNumber({
    fallback,
    name,
    value,
  }).pipe(
    E.filterOrFail(
      (parsedValue) => parsedValue > 0,
      () => {
        return new Error(`"${name}" must be greater than zero.`);
      },
    ),
  );
}

function includeWhenDefined<Key extends string, Value>(
  key: Key,
  value: Value | undefined,
): {} | Record<Key, Value> {
  return value === undefined
    ? {}
    : ({
        [key]: value,
      } as Record<Key, Value>);
}

function parseReplayLogArguments(
  args: ReadonlyArray<string>,
): E.Effect<ReplayLogOptions, Error | Schema.SchemaError> {
  return E.gen(function* () {
    const parsedArguments = yield* E.try({
      catch: toError,
      try: () => {
        return parseArgs({
          allowPositionals: false,
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

    const rawArguments = {
      inputFilePath: parsedArguments.values.input,
      outputFilePath: parsedArguments.values.output,
      ...includeWhenDefined(
        "initialDelay",
        parsedArguments.values["initial-delay"],
      ),
      ...includeWhenDefined("maxDelay", parsedArguments.values["max-delay"]),
      ...includeWhenDefined("speed", parsedArguments.values.speed),
    };

    const decodedArguments = yield* Schema.decodeUnknownEffect(
      ReplayLogArgumentsSchema,
    )(rawArguments);

    const speed = yield* parsePositiveNumber({
      fallback: 1,
      name: "speed",
      value: decodedArguments.speed,
    });

    const initialDelayMilliseconds = yield* parseNonNegativeNumber({
      fallback: 1_000,
      name: "initial-delay",
      value: decodedArguments.initialDelay,
    });

    const maxDelayMilliseconds = yield* parseNonNegativeNumber({
      fallback: 10_000,
      name: "max-delay",
      value: decodedArguments.maxDelay,
    });

    return {
      initialDelayMilliseconds,
      inputFilePath: decodedArguments.inputFilePath,
      maxDelayMilliseconds,
      outputFilePath: decodedArguments.outputFilePath,
      speed,
    };
  });
}

function getLineTimestamp(line: string): number | undefined {
  const separatorIndex = line.indexOf("|");

  if (separatorIndex === -1) {
    return undefined;
  }

  const timestamp = Date.parse(line.slice(0, separatorIndex));

  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function getReplayDelay({
  currentLine,
  maxDelayMilliseconds,
  previousLine,
  speed,
}: {
  readonly currentLine: string;
  readonly maxDelayMilliseconds: number;
  readonly previousLine: string;
  readonly speed: number;
}): number {
  const previousTimestamp = getLineTimestamp(previousLine);

  const currentTimestamp = getLineTimestamp(currentLine);

  if (previousTimestamp === undefined || currentTimestamp === undefined) {
    return 0;
  }

  const originalDelay = Math.max(0, currentTimestamp - previousTimestamp);

  return Math.min(originalDelay / speed, maxDelayMilliseconds);
}

function replayLogFile({
  initialDelayMilliseconds,
  inputFilePath,
  maxDelayMilliseconds,
  outputFilePath,
  speed,
}: ReplayLogOptions) {
  return E.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const resolvedInputPath = path.resolve(inputFilePath);

    const resolvedOutputPath = path.resolve(outputFilePath);

    if (resolvedInputPath === resolvedOutputPath) {
      return yield* E.fail(
        new Error("The input and output file paths must be different."),
      );
    }

    const contents = yield* fileSystem.readFileString(resolvedInputPath);

    const lines = contents.split(/\r?\n/).filter((line) => line.length > 0);

    if (lines.length === 0) {
      return yield* E.fail(
        new Error(`The input log contains no lines: "${resolvedInputPath}".`),
      );
    }

    yield* fileSystem.makeDirectory(path.dirname(resolvedOutputPath), {
      recursive: true,
    });

    yield* fileSystem.writeFileString(resolvedOutputPath, "");

    yield* E.logInfo("Created replay log.", {
      lineCount: lines.length,
      outputFilePath: resolvedOutputPath,
      speed,
    });

    yield* E.sleep(`${initialDelayMilliseconds} millis`);

    for (const [index, line] of lines.entries()) {
      if (index > 0) {
        const previousLine = lines[index - 1];

        if (previousLine !== undefined) {
          const delay = getReplayDelay({
            currentLine: line,
            maxDelayMilliseconds,
            previousLine,
            speed,
          });

          if (delay > 0) {
            yield* E.sleep(`${delay} millis`);
          }
        }
      }

      yield* fileSystem.writeFileString(resolvedOutputPath, `${line}\r\n`, {
        flag: "a",
      });

      yield* E.logDebug(`[${index + 1}/${lines.length}] ${line}`);
    }

    yield* E.logInfo("Log replay completed.");
  });
}

const ProgramLive = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);

const program = parseReplayLogArguments(process.argv.slice(2)).pipe(
  E.flatMap(replayLogFile),
);

await E.runPromise(program.pipe(E.provide(ProgramLive)));
