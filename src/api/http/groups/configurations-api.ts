import * as Schema from "effect/Schema";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import * as HttpApiSchema from "effect/unstable/httpapi/HttpApiSchema";

import { ROUTES } from "@/api/constants/routes.ts";
import {
  ConfigurationApiConfigurationListSchema,
  ConfigurationApiConfigurationSchema,
  CreateConfigurationApiRequestSchema,
} from "@/services/api/configuration/configuration-api-schema.ts";

const ConfigurationIdParamsSchema = Schema.Struct({
  id: Schema.String.check(Schema.isUUID()),
});

const CreatedConfigurationSchema = ConfigurationApiConfigurationSchema.pipe(
  HttpApiSchema.status(201),
);

const GetConfigurationsEndpoint = HttpApiEndpoint.get(
  "getConfigurations",
  ROUTES.configurations,
  {
    error: HttpApiError.InternalServerErrorNoContent,
    success: ConfigurationApiConfigurationListSchema,
  },
);

const GetConfigurationEndpoint = HttpApiEndpoint.get(
  "getConfiguration",
  `${ROUTES.configurations}/:id`,
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
  ROUTES.configurations,
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
  `${ROUTES.configurations}/:id`,
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
