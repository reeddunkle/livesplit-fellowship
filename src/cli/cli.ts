import "dotenv/config";

import * as E from "effect/Effect";
import * as Exit from "effect/Exit";

import { logCause } from "@/logging/log-cause.ts";
import { LiveSplitRuntime } from "@/runtimes/live-split-runtime.ts";
import { LiveSplitCLI } from "@/services/cli/live-split-cli-service.ts";

const program = E.gen(function* () {
  const cli = yield* LiveSplitCLI;

  yield* cli.run(process.argv.slice(2));
});

const exit = await LiveSplitRuntime.runPromiseExit(
  program.pipe(E.tapCause(logCause)),
);

if (Exit.isFailure(exit)) {
  process.exitCode = 1;
}

await LiveSplitRuntime.dispose();
