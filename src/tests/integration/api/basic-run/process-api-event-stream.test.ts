import path from "node:path";
import * as E from "effect/Effect";
import { describe, expect, test } from "vitest";

import { processApiEventStream } from "@/application/run-processing/process-api-event-stream.ts";
import { Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { runTest } from "@/tests/common/run-test.ts";
import { makeApiAppMock } from "@/tests/layers/api-app-mock-layer.ts";

import { configuration } from "./configuration.ts";

describe("processApiEventStream", () => {
  test("publishes API events for completed milestones", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const { harness, layer } = yield* makeApiAppMock();

        yield* E.gen(function* () {
          const fellowship = yield* Fellowship;

          const logFilePath = path.join(import.meta.dirname, "log.txt");

          yield* processApiEventStream({
            configuration,
            events: fellowship.streamEvents(logFilePath),
          });
        }).pipe(E.provide(layer));

        const messages = yield* harness.getParsedMessages();

        expect(messages).toHaveLength(configuration.milestones.length + 1);

        expect(messages[0]).toMatchObject({
          event: {
            type: "RUN_STARTED",
          },
          version: 1,
        });

        const milestoneMessages = messages.slice(1);

        expect(milestoneMessages).toHaveLength(configuration.milestones.length);

        expect(milestoneMessages).toEqual(
          expect.arrayContaining(
            configuration.milestones.map((milestone) => {
              return expect.objectContaining({
                event: expect.objectContaining({
                  milestone: expect.objectContaining({
                    label: milestone.label,
                    milestoneId: milestone.milestoneId,
                  }),
                  type: "MILESTONE_COMPLETED",
                }),
                version: 1,
              });
            }),
          ),
        );
      }),
    );

    await runTest(program);
  });
});
