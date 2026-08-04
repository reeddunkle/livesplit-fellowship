import * as E from "effect/Effect";

import { AppRuntime } from "@/runtimes/app-runtime.ts";
import { LiveSplits } from "@/services/live-split/live-split-service.ts";

const program = E.gen(function* () {
  const liveSplits = yield* LiveSplits;
  const currentTime = yield* liveSplits.getCurrentTime();

  yield* E.logInfo(`LiveSplit current time: ${currentTime}`);
});

await AppRuntime.runPromise(program);
await AppRuntime.dispose();
