import * as E from "effect/Effect";
import * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import {
  type RunApiMessage,
  RunApiMessageSchema,
} from "@/api/validation/run-api-message-schema.ts";

const API_EVENTS_URL = `ws://${import.meta.env.API_HOST}:${import.meta.env.API_PORT}/events`;

export function makeApiEventStream(): Stream.Stream<RunApiMessage, unknown> {
  return Stream.callback<RunApiMessage, unknown>((queue) => {
    return E.acquireRelease(
      E.callback<WebSocket, Error>((resume) => {
        const websocket = new WebSocket(API_EVENTS_URL);

        const handleOpen = () => {
          resume(E.succeed(websocket));
        };

        const handleError = () => {
          resume(
            E.fail(
              new Error(
                `Failed to connect to Fellowship API at ${API_EVENTS_URL}.`,
              ),
            ),
          );
        };

        websocket.addEventListener("open", handleOpen, {
          once: true,
        });

        websocket.addEventListener("error", handleError, {
          once: true,
        });

        return E.sync(() => {
          websocket.removeEventListener("open", handleOpen);
          websocket.removeEventListener("error", handleError);
        });
      }),
      (websocket) => {
        return E.sync(() => {
          websocket.close();
        });
      },
    ).pipe(
      E.flatMap((websocket) => {
        return E.callback<void>((resume) => {
          const handleMessage = (event: MessageEvent) => {
            void E.runPromise(
              E.gen(function* () {
                const parsed = yield* E.try({
                  catch: (cause) => {
                    return cause;
                  },
                  try: () => {
                    return JSON.parse(String(event.data)) as unknown;
                  },
                });

                const message =
                  yield* Schema.decodeUnknownEffect(RunApiMessageSchema)(
                    parsed,
                  );

                yield* Queue.offer(queue, message);
              }),
            );
          };

          const handleClose = () => {
            resume(E.void);
          };

          websocket.addEventListener("message", handleMessage);
          websocket.addEventListener("close", handleClose, {
            once: true,
          });

          return E.sync(() => {
            websocket.removeEventListener("message", handleMessage);
            websocket.removeEventListener("close", handleClose);
          });
        });
      }),
    );
  });
}
