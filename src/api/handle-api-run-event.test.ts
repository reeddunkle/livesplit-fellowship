import * as DateTime from "effect/DateTime";
import * as E from "effect/Effect";
import { describe, expect, test } from "vitest";

import {
  RUN_PROCESSING_EVENT,
  type RunProcessingEvent,
} from "@/services/fellowship/runs/process-run-event.ts";
import { makePushEventServerTestHarness } from "@/tests/common/push-event-server-test-harness.ts";
import { runTest } from "@/tests/common/run-test.ts";

import { handleApiRunEvent } from "./publish-run-api-state.ts";

describe("handleApiRunEvent", () => {
  test("publishes a run started event", async () => {
    const program = E.gen(function* () {
      const harness = yield* makePushEventServerTestHarness();

      const event: RunProcessingEvent = {
        timestamp: DateTime.makeUnsafe(1_000),
        type: RUN_PROCESSING_EVENT.RUN_STARTED,
      };

      yield* handleApiRunEvent({
        event,
        pushEventServer: harness.pushEventServer,
      });

      const messages = yield* harness.getParsedMessages();

      expect(messages).toEqual([
        {
          event: {
            timestampMilliseconds: 1_000,
            type: "RUN_STARTED",
          },
          version: 1,
        },
      ]);
    });

    await runTest(program);
  });

  test("publishes a completed milestone", async () => {
    const program = E.gen(function* () {
      const harness = yield* makePushEventServerTestHarness();

      const event: RunProcessingEvent = {
        milestone: {
          elapsedMilliseconds: 12_345,
          label: "Desecrator 1 Killed",
          milestoneId: "desecrator:killed:1",
          timestamp: DateTime.makeUnsafe(13_345),
        },
        type: RUN_PROCESSING_EVENT.MILESTONE_COMPLETED,
      };

      yield* handleApiRunEvent({
        event,
        pushEventServer: harness.pushEventServer,
      });

      const messages = yield* harness.getParsedMessages();

      expect(messages).toEqual([
        {
          event: {
            milestone: {
              elapsedMilliseconds: 12_345,
              label: "Desecrator 1 Killed",
              milestoneId: "desecrator:killed:1",
              timestampMilliseconds: 13_345,
            },
            type: "MILESTONE_COMPLETED",
          },
          version: 1,
        },
      ]);
    });

    await runTest(program);
  });

  test("publishes a run exited event", async () => {
    const program = E.gen(function* () {
      const harness = yield* makePushEventServerTestHarness();

      const event: RunProcessingEvent = {
        timestamp: DateTime.makeUnsafe(20_000),
        type: RUN_PROCESSING_EVENT.RUN_EXITED,
      };

      yield* handleApiRunEvent({
        event,
        pushEventServer: harness.pushEventServer,
      });

      const messages = yield* harness.getParsedMessages();

      expect(messages).toEqual([
        {
          event: {
            timestampMilliseconds: 20_000,
            type: "RUN_EXITED",
          },
          version: 1,
        },
      ]);
    });

    await runTest(program);
  });
});
