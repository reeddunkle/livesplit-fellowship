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
import { UuidSchema } from "@/validation/common.ts";

const CONFIGURATIONS_PATH = "/configurations" as const;

const ConfigurationIdParamsSchema = Schema.Struct({
  id: UuidSchema,
});

const CreatedConfigurationSchema = ConfigurationApiConfigurationSchema.pipe(
  HttpApiSchema.status(201),
);

const GetConfigurationsEndpoint = HttpApiEndpoint.get(
  "getConfigurations",
  CONFIGURATIONS_PATH,
  {
    error: HttpApiError.InternalServerErrorNoContent,
    success: ConfigurationApiConfigurationListSchema,
  },
);

const GetConfigurationEndpoint = HttpApiEndpoint.get(
  "getConfiguration",
  `${CONFIGURATIONS_PATH}/:id`,
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
  CONFIGURATIONS_PATH,
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
  `${CONFIGURATIONS_PATH}/:id`,
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
