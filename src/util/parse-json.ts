import * as E from "effect/Effect";

export type ParseJsonOptions<Error> = {
  readonly contents: string;
  readonly onError: (cause: unknown) => Error;
};

export function parseJson<Error>({
  contents,
  onError,
}: ParseJsonOptions<Error>): E.Effect<unknown, Error> {
  return E.try({
    catch: onError,
    try: () => JSON.parse(contents),
  });
}
