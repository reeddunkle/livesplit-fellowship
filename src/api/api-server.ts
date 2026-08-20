import * as E from "effect/Effect";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { PushEventServer } from "@/services/api/push-event-server-service.ts";

const EVENTS_PATH = "/events";

const handleRequest = E.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const pushEventServer = yield* PushEventServer;

  if (request.url !== EVENTS_PATH) {
    return HttpServerResponse.text("Not Found", {
      status: 404,
    });
  }

  yield* E.logDebug("WebSocket upgrade requested.", {
    method: request.method,
    url: request.url,
  });

  yield* E.scoped(
    E.gen(function* () {
      const socket = yield* request.upgrade;
      const writer = yield* socket.writer;

      const writeMessage = (message: string) => {
        return writer(message);
      };

      yield* pushEventServer.registerClient(writeMessage);

      const clientCount = yield* pushEventServer.clientCount;

      yield* E.logInfo("WebSocket client connected.", {
        clientCount,
        url: request.url,
      });

      yield* socket.runRaw(
        () => {
          return E.void;
        },
        {
          onOpen: E.gen(function* () {
            yield* E.logDebug("WebSocket socket opened.", {
              url: request.url,
            });

            yield* pushEventServer.sendLatestToClient(writeMessage).pipe(
              E.catch((error) => {
                return E.logWarning(
                  "Failed to send latest API state to client.",
                  {
                    error,
                    url: request.url,
                  },
                );
              }),
            );
          }),
        },
      );
    }),
  ).pipe(
    E.ensuring(
      E.gen(function* () {
        const clientCount = yield* pushEventServer.clientCount;

        yield* E.logInfo("WebSocket client disconnected.", {
          clientCount,
          url: request.url,
        });
      }),
    ),
  );

  return HttpServerResponse.empty();
});

export const ApiServer = HttpServer.serve(handleRequest);
