import * as E from "effect/Effect";
import * as Option from "effect/Option";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { AppHttpApi } from "@/api/http/http-api.ts";
import { type ConfigurationStoreError } from "@/errors/configuration-store-error.ts";
import { ConfigurationApiService } from "@/services/api/configuration/configuration-api-service.ts";
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

export const ConfigurationsApiLive = HttpApiBuilder.group(
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

          return yield* configurationApiService
            .create({
              configuration,
            })
            .pipe(E.catch(mapCreateConfigurationError));
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
