import * as E from "effect/Effect";

export function toCLIError(cause: unknown): Error {
  return cause instanceof Error
    ? cause
    : new Error("An unknown CLI parsing error occurred.", {
        cause,
      });
}

export function validateNoExtraPositionals(
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
