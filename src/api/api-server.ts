import * as E from "effect/Effect";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { CreateConfigurationApiRequestSchema } from "@/services/api/configuration/configuration-api-schema.ts";
import { ConfigurationApiService } from "@/services/api/configuration/configuration-api-service.ts";
import { PushEventServer } from "@/services/api/push-event-server-service.ts";
import { FELLOWSHIP_DUNGEON } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

import { type ApiRoute, ApiRouteSchema } from "./validation/route-schema.ts";

type NotFoundRoute = {
  readonly _tag: "NotFound";
};

function getPathname(url: string): string {
  return new URL(url, "http://localhost").pathname;
}

function getRoute({
  method,
  pathname,
}: {
  readonly method: string;
  readonly pathname: string;
}): ApiRoute | NotFoundRoute {
  return Option.match(
    Schema.decodeUnknownOption(ApiRouteSchema)({
      method,
      pathname,
    }),
    {
      onNone: () => {
        return {
          _tag: "NotFound",
        } as const;
      },
      onSome: (route) => route,
    },
  );
}

function badRequestResponse() {
  return HttpServerResponse.text("Bad Request", {
    status: 400,
  });
}

function notFoundResponse() {
  return HttpServerResponse.text("Not Found", {
    status: 404,
  });
}

function internalServerErrorResponse() {
  return HttpServerResponse.text("Internal Server Error", {
    status: 500,
  });
}

const handleEventsRequest = E.gen(function* () {
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

const handleGetConfigurations = E.gen(function* () {
  const configurationApiService = yield* ConfigurationApiService;

  return yield* configurationApiService.getAll().pipe(
    E.flatMap((configurations) => {
      return HttpServerResponse.json(configurations);
    }),
    E.catch((error) =>
      E.gen(function* () {
        yield* E.logError("Failed to load configurations.", {
          error,
        });

        return internalServerErrorResponse();
      }),
    ),
  );
});

function handleGetConfiguration(id: string) {
  return E.gen(function* () {
    const configurationApiService = yield* ConfigurationApiService;

    return yield* configurationApiService.getById({ id }).pipe(
      E.flatMap(
        Option.match({
          onNone: () => E.succeed(notFoundResponse()),
          onSome: (configuration) => {
            return HttpServerResponse.json(configuration);
          },
        }),
      ),
      E.catch((error) =>
        E.gen(function* () {
          yield* E.logError("Failed to load configuration.", {
            error,
            id,
          });

          return internalServerErrorResponse();
        }),
      ),
    );
  });
}

const handleCreateConfiguration = E.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const configurationApiService = yield* ConfigurationApiService;

  const body = yield* request.json.pipe(
    E.flatMap(Schema.decodeUnknownEffect(CreateConfigurationApiRequestSchema)),
    E.map(Option.some),
    E.catch((error) =>
      E.gen(function* () {
        yield* E.logDebug("Invalid create configuration request.", {
          error,
        });

        return Option.none();
      }),
    ),
  );

  if (Option.isNone(body)) {
    return badRequestResponse();
  }

  const configuration = {
    dungeon: FELLOWSHIP_DUNGEON[body.value.configuration.dungeonKey],
    milestones: body.value.configuration.milestones,
  } satisfies FellowshipMilestoneConfiguration;

  return yield* configurationApiService
    .create({
      configuration,
    })
    .pipe(
      E.flatMap((createdConfiguration) => {
        return HttpServerResponse.json(createdConfiguration, {
          status: 201,
        });
      }),
      E.catch((error) =>
        E.gen(function* () {
          yield* E.logError("Failed to create configuration.", {
            error,
          });

          return internalServerErrorResponse();
        }),
      ),
    );
});

function handleDeleteConfiguration(id: string) {
  return E.gen(function* () {
    const configurationApiService = yield* ConfigurationApiService;

    return yield* configurationApiService.delete({ id }).pipe(
      E.as(
        HttpServerResponse.empty({
          status: 204,
        }),
      ),
      E.catch((error) =>
        E.gen(function* () {
          yield* E.logError("Failed to delete configuration.", {
            error,
            id,
          });

          return internalServerErrorResponse();
        }),
      ),
    );
  });
}

const handleRequest = E.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;

  const route = getRoute({
    method: request.method,
    pathname: getPathname(request.url),
  });

  return yield* Match.value(route).pipe(
    Match.tag("Events", () => handleEventsRequest),

    Match.tag("GetConfigurations", () => {
      return handleGetConfigurations;
    }),

    Match.tag("CreateConfiguration", () => {
      return handleCreateConfiguration;
    }),

    Match.tag("GetConfiguration", ({ pathname }) => {
      const [, id] = pathname;

      return handleGetConfiguration(id);
    }),

    Match.tag("DeleteConfiguration", ({ pathname }) => {
      const [, id] = pathname;

      return handleDeleteConfiguration(id);
    }),

    Match.tag("NotFound", () => {
      return E.succeed(notFoundResponse());
    }),

    Match.exhaustive,
  );
});

export const ApiServer = HttpServer.serve(handleRequest);
