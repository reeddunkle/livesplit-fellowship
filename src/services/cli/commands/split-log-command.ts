import * as E from "effect/Effect";
import * as Schema from "effect/Schema";

import { splitFellowshipLogFile } from "@/services/fellowship/utilities/split-fellowship-log-file.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const SplitLogCommandInputSchema = Schema.Struct({
  inputFilePath: NonEmptyStringSchema,
  outputDirectoryPath: NonEmptyStringSchema,
});

export type SplitLogCommandInput = typeof SplitLogCommandInputSchema.Type;

export function runSplitLogCommand(input: SplitLogCommandInput) {
  return E.gen(function* () {
    const result = yield* splitFellowshipLogFile({
      inputFilePath: input.inputFilePath,
      outputDirectoryPath: input.outputDirectoryPath,
    });

    yield* E.logInfo(`Split logs written to ${input.outputDirectoryPath}.`, {
      inputFilePath: input.inputFilePath,
      outputDirectoryPath: input.outputDirectoryPath,
    });

    return result;
  });
}
