import * as Schema from "effect/Schema";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import * as HttpApiSchema from "effect/unstable/httpapi/HttpApiSchema";

import {
  ConfigurationApiConfigurationListSchema,
  ConfigurationApiConfigurationSchema,
  CreateConfigurationApiRequestSchema,
} from "@/services/api/configuration/configuration-api-schema.ts";
import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id.ts";

const CONFIGURATIONS_ROUTE = "/configurations" as const;

const ConfigurationIdParamsSchema = Schema.Struct({
  id: ConfigurationIdSchema,
});

const CreatedConfigurationSchema = ConfigurationApiConfigurationSchema.pipe(
  HttpApiSchema.status(201),
);

const GetConfigurationsEndpoint = HttpApiEndpoint.get(
  "getConfigurations",
  CONFIGURATIONS_ROUTE,
  {
    error: HttpApiError.InternalServerErrorNoContent,
    success: ConfigurationApiConfigurationListSchema,
  },
);

const GetConfigurationEndpoint = HttpApiEndpoint.get(
  "getConfiguration",
  `${CONFIGURATIONS_ROUTE}/:id`,
  {
    error: [
      HttpApiError.NotFoundNoContent,
      HttpApiError.InternalServerErrorNoContent,
    ],
    params: ConfigurationIdParamsSchema,
    success: ConfigurationApiConfigurationSchema,
  },
);

const CreateConfigurationEndpoint = HttpApiEndpoint.post(
  "createConfiguration",
  CONFIGURATIONS_ROUTE,
  {
    error: [
      HttpApiError.ConflictNoContent,
      HttpApiError.InternalServerErrorNoContent,
    ],
    payload: CreateConfigurationApiRequestSchema,
    success: CreatedConfigurationSchema,
  },
);

const DeleteConfigurationEndpoint = HttpApiEndpoint.delete(
  "deleteConfiguration",
  `${CONFIGURATIONS_ROUTE}/:id`,
  {
    error: HttpApiError.InternalServerErrorNoContent,
    params: ConfigurationIdParamsSchema,
  },
);

export const ConfigurationsApi = HttpApiGroup.make("configurations").add(
  GetConfigurationsEndpoint,
  GetConfigurationEndpoint,
  CreateConfigurationEndpoint,
  DeleteConfigurationEndpoint,
);
