import { createRunMilestones } from "@/services/fellowship/milestones/create-run-milestones.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import {
  type AnalyzedFellowshipDungeonRun,
  type RawFellowshipDungeonRun,
} from "@/services/fellowship/types.ts";
import { getElapsedMilliseconds } from "@/util/get-elapsed-milliseconds.ts";

export type AnalyzeDungeonRunOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly run: RawFellowshipDungeonRun;
};

export function analyzeDungeonRun({
  configuration,
  run,
}: AnalyzeDungeonRunOptions): AnalyzedFellowshipDungeonRun {
  const startTime = run.start.startedAt;
  const endTime = run.end.timestamp;

  const milestones = createRunMilestones({
    configuration,
    run,
  });

  return {
    affixIds: run.start.affixIds,
    dungeonName: run.start.dungeonName,
    durationMilliseconds: getElapsedMilliseconds(startTime, endTime),
    endTime,
    events: run.events,
    keyLevel: run.start.keyLevel,
    mapId: run.mapId,
    milestones,
    startTime,
    succeeded: run.end.succeeded,
  };
}
