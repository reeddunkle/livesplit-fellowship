import path from "node:path";
import * as E from "effect/Effect";
import { describe, expect, test } from "vitest";

import { replayLog } from "@/services/fellowship/pipelines/replay-log.ts";
import {
  appendEOL,
  LiveSplitSendCommand,
} from "@/services/live-split/client/live-split-command.ts";
import { makeLiveSplitAppMock } from "@/tests/layers/live-split-app-mock-layer.ts";

import { configuration } from "./fixtures/basic-run/configuration.ts";

describe("replayLog", () => {
  test("sends LiveSplit commands for completed milestones", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const { harness, layer } = yield* makeLiveSplitAppMock();

        const logFilePath = path.join(
          import.meta.dirname,
          "fixtures",
          "basic-run",
          "Fellowship.log",
        );

        yield* replayLog({
          configuration,
          logFilePath,
        }).pipe(E.provide(layer));

        const commands = yield* harness.getCommands();

        expect(commands).toEqual([
          appendEOL(LiveSplitSendCommand.startTimer),
          appendEOL(LiveSplitSendCommand.split),
          appendEOL(LiveSplitSendCommand.split),
        ]);
      }),
    );

    await E.runPromise(program);
  });
});
