import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { ROUTES } from "@/api/constants/routes.ts";
import { AppHttpApi } from "@/api/http/http-api.ts";
import { type ConfigurationStoreError } from "@/errors/configuration-store-error.ts";
import { ConfigurationApiService } from "@/services/api/configuration/configuration-api-service.ts";
import { PushEventServer } from "@/services/api/push-event-server-service.ts";
import { FELLOWSHIP_DUNGEON } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

function mapConfigurationError(
  error: ConfigurationStoreError,
): E.Effect<never, HttpApiError.InternalServerError> {
  return E.gen(function* () {
    yield* E.logError("Configuration persistence operation failed.", {
      error,
    });

    return yield* E.fail(new HttpApiError.InternalServerError());
  });
}

function mapCreateConfigurationError(
  error: ConfigurationStoreError,
): E.Effect<never, HttpApiError.Conflict | HttpApiError.InternalServerError> {
  if (error.details._tag === "DuplicateConfiguration") {
    return E.fail(new HttpApiError.Conflict());
  }

  return mapConfigurationError(error);
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

const ConfigurationsApiLive = HttpApiBuilder.group(
  AppHttpApi,
  "configurations",
  (handlers) => {
    return handlers
      .handle("getConfigurations", () => {
        return E.gen(function* () {
          const configurationApiService = yield* ConfigurationApiService;

          return yield* configurationApiService
            .getAll()
            .pipe(E.catch(mapConfigurationError));
        });
      })
      .handle("getConfiguration", ({ params }) => {
        return E.gen(function* () {
          const configurationApiService = yield* ConfigurationApiService;

          const configuration = yield* configurationApiService
            .getById({
              id: params.id,
            })
            .pipe(E.catch(mapConfigurationError));

          if (Option.isNone(configuration)) {
            return yield* E.fail(new HttpApiError.NotFound());
          }

          return configuration.value;
        });
      })
      .handle("createConfiguration", ({ payload }) => {
        return E.gen(function* () {
          const configurationApiService = yield* ConfigurationApiService;

          const configuration = {
            dungeon: FELLOWSHIP_DUNGEON[payload.configuration.dungeonKey],
            milestones: payload.configuration.milestones,
          } satisfies FellowshipMilestoneConfiguration;

          const createdConfiguration = yield* configurationApiService
            .create({
              configuration,
            })
            .pipe(E.catch(mapCreateConfigurationError));

          return createdConfiguration;
        });
      })
      .handle("deleteConfiguration", ({ params }) => {
        return E.gen(function* () {
          const configurationApiService = yield* ConfigurationApiService;

          yield* configurationApiService
            .delete({
              id: params.id,
            })
            .pipe(E.catch(mapConfigurationError));
        });
      });
  },
);

const HttpApiRoutes = HttpApiBuilder.layer(AppHttpApi).pipe(
  Layer.provide(ConfigurationsApiLive),
);

const EventsRoutes = HttpRouter.addAll([
  HttpRouter.route("GET", ROUTES.events, handleEventsRequest),
]);

const ApiRoutes = Layer.mergeAll(HttpApiRoutes, EventsRoutes);

export const ApiServer = HttpRouter.serve(ApiRoutes);
