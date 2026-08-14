import "dotenv/config";

import * as E from "effect/Effect";
import * as Exit from "effect/Exit";

import { logCause } from "@/logging/log-cause.ts";
import { AppRuntime } from "@/runtimes/app-runtime.ts";
import { CLI } from "@/services/cli/cli-service.ts";

const program = E.gen(function* () {
  const cli = yield* CLI;

  yield* cli.run(process.argv.slice(2));
});

const exit = await AppRuntime.runPromiseExit(
  program.pipe(E.tapCause(logCause)),
);

if (Exit.isFailure(exit)) {
  process.exitCode = 1;
}

await AppRuntime.dispose();
