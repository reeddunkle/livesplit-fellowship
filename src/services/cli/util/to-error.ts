export function toError(cause: unknown): Error {
  return cause instanceof Error
    ? cause
    : new Error("An unknown CLI parsing error occurred.", {
        cause,
      });
}
