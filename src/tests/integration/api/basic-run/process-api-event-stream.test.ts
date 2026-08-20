import path from "node:path";
import * as E from "effect/Effect";
import { describe, expect, test } from "vitest";

import { processApiEventStream } from "@/application/run-processing/process-api-event-stream.ts";
import { Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { runTest } from "@/tests/common/run-test.ts";
import { makeApiAppMock } from "@/tests/layers/api-app-mock-layer.ts";

import { configuration } from "./configuration.ts";

describe("processApiEventStream", () => {
  test("publishes API state updates for the run", async () => {
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

        expect(messages.length).toBeGreaterThan(0);

        expect(messages[0]).toMatchObject({
          state: {
            run: {
              startedAtMilliseconds: expect.any(Number),
            },
          },
          version: 1,
        });

        const finalMessage = messages.at(-1);

        expect(finalMessage).toBeDefined();

        expect(finalMessage).toMatchObject({
          state: {
            milestones: expect.arrayContaining(
              configuration.milestones.map((milestone) => {
                return expect.objectContaining({
                  completedAtMilliseconds: expect.any(Number),
                  elapsedMilliseconds: expect.any(Number),
                  label: milestone.label,
                  milestoneId: milestone.milestoneId,
                  requirements: expect.any(Array),
                });
              }),
            ),
          },
          version: 1,
        });
      }),
    );

    await runTest(program);
  });
});
