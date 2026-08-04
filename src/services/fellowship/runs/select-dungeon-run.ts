import { type AnalyzedFellowshipDungeonRun } from "@/services/fellowship/types.ts";

export function selectLastDungeonRun<T>(runs: ReadonlyArray<T>): T | undefined {
  return runs.at(-1);
}

export function selectFirstDungeonRun<T>(
  runs: ReadonlyArray<T>,
): T | undefined {
  return runs[0];
}

export function selectFastestDungeonRun(
  runs: ReadonlyArray<AnalyzedFellowshipDungeonRun>,
): AnalyzedFellowshipDungeonRun | undefined {
  return runs.reduce<AnalyzedFellowshipDungeonRun | undefined>(
    (fastest, run) => {
      if (
        fastest === undefined ||
        run.durationMilliseconds < fastest.durationMilliseconds
      ) {
        return run;
      }

      return fastest;
    },
    undefined,
  );
}
