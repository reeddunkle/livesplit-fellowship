import * as E from "effect/Effect";
import * as Schema from "effect/Schema";

import { FellowshipRunNotFoundError } from "@/errors/fellowship-run-not-found-error.ts";
import { createGoalData } from "@/services/fellowship/goals/create-goal-data.ts";
import { writeGoalData } from "@/services/fellowship/goals/write-goal-data.ts";
import { loadMilestoneConfiguration } from "@/services/fellowship/milestones/load-milestone-configuration.ts";
import { analyzeLogFile } from "@/services/fellowship/pipelines/analyze-log-file.ts";
import { selectLastDungeonRun } from "@/services/fellowship/runs/select-dungeon-run.ts";
import { applySplitModel } from "@/services/fellowship/splits/apply-split-model.ts";
import { createSplitModelFromRun } from "@/services/fellowship/splits/create-split-model-from-run.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const AnalyzeLogCommandInputSchema = Schema.Struct({
  configurationFilePath: NonEmptyStringSchema,
  logFilePath: NonEmptyStringSchema,
  outputFilePath: NonEmptyStringSchema,
});

export type AnalyzeLogCommandInput = typeof AnalyzeLogCommandInputSchema.Type;

export function runAnalyzeLogCommand(input: AnalyzeLogCommandInput) {
  return E.gen(function* () {
    const configuration = yield* loadMilestoneConfiguration({
      filePath: input.configurationFilePath,
    });

    const runs = yield* analyzeLogFile({
      configuration,
      logFilePath: input.logFilePath,
    });

    const run = selectLastDungeonRun(runs);

    if (run === undefined) {
      const errorProperties = {
        dungeonName: configuration.dungeon.name,
        logFilePath: input.logFilePath,
      };

      return yield* new FellowshipRunNotFoundError(errorProperties);
    }

    const splitModel = createSplitModelFromRun({
      configuration,
      run,
    });

    const splitResults = yield* applySplitModel({
      configuration,
      milestones: run.milestones,
      splitModel,
    });

    const goal = createGoalData({
      configuration,
      splitModel,
      splitResults,
    });

    yield* writeGoalData({
      filePath: input.outputFilePath,
      goal,
    });

    return goal;
  });
}
