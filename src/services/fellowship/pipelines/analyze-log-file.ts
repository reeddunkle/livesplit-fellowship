import * as A from "effect/Array";
import * as E from "effect/Effect";
import { pipe } from "effect/Function";

import {
  Fellowship,
  type FellowshipReadError,
} from "@/services/fellowship/fellowship-service.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { analyzeDungeonRun } from "@/services/fellowship/runs/analyze-dungeon-run.ts";
import { filterDungeonRuns } from "@/services/fellowship/runs/filter-dungeon-runs.ts";
import { groupDungeonRuns } from "@/services/fellowship/runs/group-dungeon-runs.ts";
import { type AnalyzedFellowshipDungeonRun } from "@/services/fellowship/types.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

export type AnalyzeLogFileOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly logFilePath: string;
};

type AnalyzeFellowshipEventsOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly events: ReadonlyArray<FellowshipEvent>;
};

export function analyzeFellowshipEvents({
  configuration,
  events,
}: AnalyzeFellowshipEventsOptions): ReadonlyArray<AnalyzedFellowshipDungeonRun> {
  return pipe(
    events,
    groupDungeonRuns,
    (runs) => {
      return filterDungeonRuns({
        query: configuration,
        runs,
      });
    },
    A.map((run) => {
      return analyzeDungeonRun({
        configuration,
        run,
      });
    }),
  );
}

export function analyzeLogFile({
  configuration,
  logFilePath,
}: AnalyzeLogFileOptions): E.Effect<
  ReadonlyArray<AnalyzedFellowshipDungeonRun>,
  FellowshipReadError,
  Fellowship
> {
  return E.gen(function* () {
    const fellowship = yield* Fellowship;
    const events = yield* fellowship.readEvents(logFilePath);

    return analyzeFellowshipEvents({
      configuration,
      events,
    });
  });
}
