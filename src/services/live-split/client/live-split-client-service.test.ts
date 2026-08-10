import * as E from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import { describe, expect, test } from "vitest";

import { makeLiveSplitClient } from "./live-split-client-service.ts";
import { appendEOL, LiveSplitRequestCommand } from "./live-split-command.ts";
import { type LiveSplitTransport } from "./node-live-split-transport.ts";

function makeLiveSplitTestHarness() {
  return E.gen(function* () {
    const incomingChunks = yield* Queue.unbounded<string>();
    const writtenData = yield* Queue.unbounded<string>();

    const transport: LiveSplitTransport = {
      chunks: Stream.fromQueue(incomingChunks),

      write: (data) => {
        return Queue.offer(writtenData, data).pipe(E.asVoid);
      },
    };

    const client = yield* makeLiveSplitClient({
      transport,
    });

    const start = <A, Error>(effect: E.Effect<A, Error>) => {
      return E.gen(function* () {
        const fiber = yield* effect.pipe(E.forkScoped);

        return {
          join: Fiber.join(fiber),
        };
      });
    };

    const takeCommand = () => {
      return Queue.take(writtenData);
    };

    const sendResponse = (response: string) => {
      return Queue.offer(incomingChunks, appendEOL(response)).pipe(E.asVoid);
    };

    const sendChunk = (chunk: string) => {
      return Queue.offer(incomingChunks, chunk).pipe(E.asVoid);
    };

    return {
      client,
      sendChunk,
      sendResponse,
      start,
      takeCommand,
    };
  });
}

describe("LiveSplitClient", () => {
  test("gets the current time", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const harness = yield* makeLiveSplitTestHarness();

        const request = yield* harness.start(harness.client.getCurrentTime());

        const command = yield* harness.takeCommand();

        expect(command).toBe(appendEOL(LiveSplitRequestCommand.getCurrentTime));

        yield* harness.sendResponse("00:01:23");

        expect(yield* request.join).toBe("00:01:23");
      }),
    );

    await E.runPromise(program);
  });

  test("assembles a response split across multiple chunks", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const harness = yield* makeLiveSplitTestHarness();

        const request = yield* harness.start(harness.client.getCurrentTime());

        yield* harness.takeCommand();

        yield* harness.sendChunk("00:01");
        yield* harness.sendChunk(":23\r");
        yield* harness.sendChunk("\n");

        expect(yield* request.join).toBe("00:01:23");
      }),
    );

    await E.runPromise(program);
  });

  test("handles multiple responses in one chunk", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const harness = yield* makeLiveSplitTestHarness();

        const currentTimeRequest = yield* harness.start(
          harness.client.getCurrentTime(),
        );

        yield* harness.takeCommand();

        const splitIndexRequest = yield* harness.start(
          harness.client.getSplitIndex(),
        );

        yield* harness.sendChunk(`${appendEOL("00:01:23")}${appendEOL("4")}`);

        const [currentTime, splitIndex] = yield* E.all(
          [currentTimeRequest.join, splitIndexRequest.join],
          { concurrency: "unbounded" },
        );

        expect(currentTime).toBe("00:01:23");
        expect(splitIndex).toBe(4);
      }),
    );

    await E.runPromise(program);
  });

  test("serializes concurrent response-producing requests", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const harness = yield* makeLiveSplitTestHarness();

        const currentTimeRequest = yield* harness.start(
          harness.client.getCurrentTime(),
        );

        const splitIndexRequest = yield* harness.start(
          harness.client.getSplitIndex(),
        );

        const firstCommand = yield* harness.takeCommand();

        expect(firstCommand).toBe(
          appendEOL(LiveSplitRequestCommand.getCurrentTime),
        );

        yield* harness.sendResponse("00:01:23");

        const secondCommand = yield* harness.takeCommand();

        expect(secondCommand).toBe(
          appendEOL(LiveSplitRequestCommand.getSplitIndex),
        );

        yield* harness.sendResponse("4");

        const [currentTime, splitIndex] = yield* E.all(
          [currentTimeRequest.join, splitIndexRequest.join],
          { concurrency: "unbounded" },
        );

        expect(currentTime).toBe("00:01:23");
        expect(splitIndex).toBe(4);
      }),
    );

    await E.runPromise(program);
  });
});
