import * as E from "effect/Effect";
import * as Schema from "effect/Schema";

import { filterFellowshipLogFile } from "@/services/fellowship/pipelines/filter-fellowship-log-file.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const FilterLogCommandInputSchema = Schema.Struct({
  inputFilePath: NonEmptyStringSchema,
  outputFilePath: NonEmptyStringSchema,
});

export type FilterLogCommandInput = typeof FilterLogCommandInputSchema.Type;

export function runFilterLogCommand(input: FilterLogCommandInput) {
  return E.gen(function* () {
    const result = yield* filterFellowshipLogFile({
      inputFilePath: input.inputFilePath,
      outputFilePath: input.outputFilePath,
    });

    yield* E.logInfo(`Filtered log written to ${input.outputFilePath}.`, {
      inputFilePath: input.inputFilePath,
      outputFilePath: input.outputFilePath,
      removedLineCount: result.totalLineCount - result.retainedLineCount,
      retainedLineCount: result.retainedLineCount,
      totalLineCount: result.totalLineCount,
    });

    return result;
  });
}
