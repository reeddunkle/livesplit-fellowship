import * as E from "effect/Effect";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { PushEventServer } from "@/services/api/push-event-server-service.ts";

const handleRequest = E.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const pushEventServer = yield* PushEventServer;

  yield* E.logDebug("WebSocket upgrade requested.", {
    method: request.method,
    url: request.url,
  });

  yield* E.scoped(
    E.gen(function* () {
      const socket = yield* request.upgrade;
      const writer = yield* socket.writer;

      yield* pushEventServer.registerClient((message) => {
        return writer(message);
      });

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
          onOpen: E.logDebug("WebSocket socket opened.", {
            url: request.url,
          }),
        },
      );
    }).pipe(
      E.ensuring(
        E.gen(function* () {
          const clientCount = yield* pushEventServer.clientCount;

          yield* E.logInfo("WebSocket client disconnected.", {
            clientCount,
            url: request.url,
          });
        }),
      ),
    ),
  );

  return HttpServerResponse.empty();
});

export const ApiServer = HttpServer.serve(handleRequest);
