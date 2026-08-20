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

        if (finalMessage === undefined) {
          return;
        }

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

        const desecrator1 = finalMessage.state.milestones.find((milestone) => {
          return milestone.milestoneId === "desecrator:killed:1";
        });

        expect(desecrator1).toBeDefined();

        expect(desecrator1?.requirements).toEqual([
          expect.objectContaining({
            id: "42",
            observations: [
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
            ],
            requiredCount: 1,
            type: "UNIT_DEATH",
          }),
        ]);

        const desecrator2 = finalMessage.state.milestones.find((milestone) => {
          return milestone.milestoneId === "desecrator:killed:2";
        });

        expect(desecrator2).toBeDefined();

        expect(desecrator2?.requirements).toEqual([
          expect.objectContaining({
            id: "42",
            observations: [
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
            ],
            requiredCount: 2,
            type: "UNIT_DEATH",
          }),
        ]);

        const butcher2 = finalMessage.state.milestones.find((milestone) => {
          return milestone.milestoneId === "butcher:killed:2";
        });

        expect(butcher2).toBeDefined();

        expect(butcher2?.requirements).toEqual([
          expect.objectContaining({
            id: "41",
            observations: [
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
            ],
            requiredCount: 2,
            type: "UNIT_DEATH",
          }),
        ]);

        const shadowlord2 = finalMessage.state.milestones.find((milestone) => {
          return milestone.milestoneId === "shadowlord:killed:2";
        });

        expect(shadowlord2).toBeDefined();

        expect(shadowlord2?.requirements).toEqual([
          expect.objectContaining({
            id: "274",
            observations: [
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
            ],
            requiredCount: 2,
            type: "UNIT_DEATH",
          }),
        ]);

        const bossPull = finalMessage.state.milestones.find((milestone) => {
          return milestone.milestoneId === "boss:pulled";
        });

        expect(bossPull?.requirements).toEqual([
          expect.objectContaining({
            id: "30",
            observations: [
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
            ],
            requiredCount: 1,
            type: "ENCOUNTER_START",
          }),
        ]);

        const bossKill = finalMessage.state.milestones.find((milestone) => {
          return milestone.milestoneId === "boss:defeated";
        });

        expect(bossKill?.requirements).toEqual([
          expect.objectContaining({
            id: "30",
            observations: [
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
            ],
            requiredCount: 1,
            type: "ENCOUNTER_END",
          }),
        ]);
      }),
    );

    await runTest(program);
  });
});
