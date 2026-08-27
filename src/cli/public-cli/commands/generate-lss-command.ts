import * as E from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { DungeonDAO } from "@/db/daos/dungeon/dungeon-dao.ts";
import { loadMilestoneConfiguration } from "@/services/fellowship/milestones/load-milestone-configuration.ts";
import { generateLSSFile } from "@/services/live-split/files/lss/generate-lss-file.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const GenerateLSSCommandInputSchema = Schema.Struct({
  configurationFilePath: NonEmptyStringSchema,
  outputFilePath: NonEmptyStringSchema,
});

export type GenerateLSSCommandInput = typeof GenerateLSSCommandInputSchema.Type;

export const runGenerateLSSCommand = E.fn("cli.generate-lss")(function* (
  input: GenerateLSSCommandInput,
) {
  const dungeonDAO = yield* DungeonDAO;

  const configuration = yield* loadMilestoneConfiguration({
    filePath: input.configurationFilePath,
  });

  const dungeonOption = yield* dungeonDAO.getById({
    id: configuration.dungeonId,
  });

  const dungeon = yield* Option.match(dungeonOption, {
    onNone: () => {
      return E.fail(new Error(`Unknown dungeon "${configuration.dungeonId}".`));
    },
    onSome: E.succeed,
  });

  yield* generateLSSFile({
    configuration,
    dungeonName: dungeon.name,
    filePath: input.outputFilePath,
  });

  yield* E.logInfo("Generated LiveSplit splits file.", {
    configurationFilePath: input.configurationFilePath,
    dungeonId: configuration.dungeonId,
    dungeonName: dungeon.name,
    milestoneCount: configuration.milestones.length,
    outputFilePath: input.outputFilePath,
  });
});
