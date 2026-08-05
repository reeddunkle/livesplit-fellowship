import { type RawFellowshipDungeonRun } from "@/services/fellowship/types.ts";

import { type FellowshipMilestoneConfiguration } from "../milestones/milestone-types.ts";
import { doesDungeonRunMatchConfiguration } from "./does-dungeon-run-match-configuration.ts";

type FilterDungeonRunsOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly runs: ReadonlyArray<RawFellowshipDungeonRun>;
};

export function filterDungeonRuns({
  configuration,
  runs,
}: FilterDungeonRunsOptions): ReadonlyArray<RawFellowshipDungeonRun> {
  return runs.filter((run) => {
    return doesDungeonRunMatchConfiguration({
      configuration,
      run,
    });
  });
}
