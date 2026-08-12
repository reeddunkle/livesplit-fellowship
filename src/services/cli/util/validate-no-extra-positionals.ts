import * as E from "effect/Effect";

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
