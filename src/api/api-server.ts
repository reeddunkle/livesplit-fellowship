import * as E from "effect/Effect";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { PushEventServer } from "@/services/api/push-event-server-service.ts";

const handleRequest = E.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const pushEventServer = yield* PushEventServer;

  yield* E.scoped(
    E.gen(function* () {
      const socket = yield* request.upgrade;
      const writer = yield* socket.writer;

      yield* pushEventServer.registerClient((message) => {
        return writer(message);
      });

      yield* socket.runRaw(
        () => {
          return E.void;
        },
        {
          onOpen: E.logInfo("Socket runRaw open"),
        },
      );
    }),
  );

  return HttpServerResponse.empty();
});

export const ApiServer = HttpServer.serve(handleRequest);
