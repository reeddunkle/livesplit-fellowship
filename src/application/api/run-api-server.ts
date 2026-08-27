import * as E from "effect/Effect";
import * as HttpServer from "effect/unstable/http/HttpServer";

export const startApiServer = E.gen(function* () {
  const httpServer = yield* HttpServer.HttpServer;

  yield* E.logInfo("Fellowship API server running.", {
    address: HttpServer.formatAddress(httpServer.address),
  });

  return httpServer;
});

export const runApiServer = E.gen(function* () {
  yield* startApiServer;

  return yield* E.never;
});
