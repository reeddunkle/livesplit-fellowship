import * as Cause from "effect/Cause";
import * as E from "effect/Effect";
import * as Result from "effect/Result";

export function logCause(cause: Cause.Cause<unknown>): E.Effect<void> {
  if (Cause.hasInterruptsOnly(cause)) {
    return E.void;
  }

  if (Cause.hasDies(cause)) {
    return E.logFatal("Unexpected application defect.", {
      cause: Cause.pretty(cause),
    });
  }

  return Result.match(Cause.findError(cause), {
    onFailure: () => {
      return E.logFatal("Application failed with an unknown cause.", {
        cause: Cause.pretty(cause),
      });
    },
    onSuccess: (error) => {
      return E.logError("Application failed.", {
        error,
      });
    },
  });
}
