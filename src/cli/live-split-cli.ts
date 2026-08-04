import "dotenv/config";

import * as E from "effect/Effect";

import { LiveSplitRuntime } from "@/runtimes/live-split-runtime.ts";
import { LiveSplitCLI } from "@/services/cli/live-split-cli-service.ts";

const program = E.gen(function* () {
  const cli = yield* LiveSplitCLI;

  yield* cli.run(process.argv.slice(2));
});

try {
  await LiveSplitRuntime.runPromise(program);
} catch (cause) {
  console.error(cause);
  process.exitCode = 1;
} finally {
  await LiveSplitRuntime.dispose();
}
