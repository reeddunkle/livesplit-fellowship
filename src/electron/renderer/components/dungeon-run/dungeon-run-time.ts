import { millisecondsToMinutes } from "date-fns/millisecondsToMinutes";
import { millisecondsToSeconds } from "date-fns/millisecondsToSeconds";
import * as A from "effect/Array";
import { pipe } from "effect/Function";

import { type DungeonRunObservationInterpretation } from "@/electron/renderer/stores/dungeon-run-store/dungeon-run-provider.tsx";

export type DungeonRunComparison = "AVERAGE" | "BEST" | "LAST_RUN" | "MEDIAN";

type RequirementRow = {
  readonly completedObservation:
    | DungeonRunObservationInterpretation
    | undefined;
};

export function getObservationComparisonElapsedMilliseconds({
  comparison,
  observation,
}: {
  readonly comparison: DungeonRunComparison;
  readonly observation: DungeonRunObservationInterpretation;
}): number | undefined {
  if (observation.analytics === undefined) {
    return undefined;
  }

  if (comparison === "BEST") {
    return observation.analytics.bestElapsedMilliseconds;
  }

  if (comparison === "AVERAGE") {
    return observation.analytics.meanElapsedMilliseconds;
  }

  if (comparison === "MEDIAN") {
    return observation.analytics.medianElapsedMilliseconds;
  }

  /*
   * DungeonRunApiHistory does not currently expose the previous run's
   * observation elapsed time.
   */
  return undefined;
}

export function getComparisonElapsedMilliseconds({
  comparison,
  requirements,
}: {
  readonly comparison: DungeonRunComparison;
  readonly requirements: ReadonlyArray<RequirementRow>;
}): number | undefined {
  const comparisonTimes = pipe(
    requirements,
    A.map((requirement) => {
      if (requirement.completedObservation === undefined) {
        return undefined;
      }

      return getObservationComparisonElapsedMilliseconds({
        comparison,
        observation: requirement.completedObservation,
      });
    }),
    A.filter((value): value is number => {
      return value !== undefined;
    }),
  );

  if (
    comparisonTimes.length === 0 ||
    comparisonTimes.length !== requirements.length
  ) {
    return undefined;
  }

  /*
   * A milestone is complete when all requirements are satisfied, so its
   * comparison completion time is the latest completion among its
   * requirements.
   */
  return Math.max(...comparisonTimes);
}

function formatMilliseconds(
  milliseconds: number,
  includeSign: boolean,
): string {
  const absoluteMilliseconds = Math.abs(milliseconds);

  const minutes = millisecondsToMinutes(absoluteMilliseconds);
  const seconds = millisecondsToSeconds(absoluteMilliseconds) % 60;
  const fractionalMilliseconds = absoluteMilliseconds % 1_000;

  const sign =
    includeSign && milliseconds !== 0 ? (milliseconds < 0 ? "-" : "+") : "";

  return `${sign}${minutes}:${String(seconds).padStart(2, "0")}.${String(
    fractionalMilliseconds,
  ).padStart(3, "0")}`;
}

export function formatDuration(milliseconds: number | undefined): string {
  if (milliseconds === undefined) {
    return "—";
  }

  return formatMilliseconds(milliseconds, false);
}

export function formatSignedDuration(milliseconds: number | undefined): string {
  if (milliseconds === undefined) {
    return "—";
  }

  return formatMilliseconds(milliseconds, true);
}
