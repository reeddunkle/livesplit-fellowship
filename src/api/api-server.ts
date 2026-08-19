import * as E from "effect/Effect";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { PushEventServer } from "@/services/api/push-event-server-service.ts";

const handleRequest = E.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const pushEventServer = yield* PushEventServer;

  const socket = yield* request.upgrade;

  yield* pushEventServer.registerClient(socket);

  yield* socket.runRaw(() => {
    return E.void;
  });

  return HttpServerResponse.empty();
});

export const ApiServer = HttpServer.serve(handleRequest);
