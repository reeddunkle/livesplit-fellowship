import "dotenv/config";

import * as E from "effect/Effect";

import { AppRuntime } from "@/runtimes/app-runtime.ts";
import { CLI } from "@/services/cli/cli-service.ts";

const program = E.gen(function* () {
  const cli = yield* CLI;

  yield* cli.run(process.argv.slice(2));
});

try {
  await AppRuntime.runPromise(program);
} catch (cause) {
  console.error(cause);
  process.exitCode = 1;
} finally {
  await AppRuntime.dispose();
}
