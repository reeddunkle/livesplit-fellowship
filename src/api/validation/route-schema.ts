import * as Schema from "effect/Schema";

import { ROUTES } from "@/api/constants/routes.ts";

const ConfigurationIdPathSegmentSchema = Schema.String.check(Schema.isUUID());

const ConfigurationPathSchema = Schema.TemplateLiteral([
  `${ROUTES.configurations}/`,
  ConfigurationIdPathSegmentSchema,
]);

const ConfigurationPathParserSchema = Schema.TemplateLiteralParser(
  ConfigurationPathSchema.parts,
);

const EventsRouteSchema = Schema.Struct({
  _tag: Schema.tagDefaultOmit("Events"),
  method: Schema.Literal("GET"),
  pathname: Schema.Literal(ROUTES.events),
});

const GetConfigurationsRouteSchema = Schema.Struct({
  _tag: Schema.tagDefaultOmit("GetConfigurations"),
  method: Schema.Literal("GET"),
  pathname: Schema.Literal(ROUTES.configurations),
});

const CreateConfigurationRouteSchema = Schema.Struct({
  _tag: Schema.tagDefaultOmit("CreateConfiguration"),
  method: Schema.Literal("POST"),
  pathname: Schema.Literal(ROUTES.configurations),
});

const GetConfigurationRouteSchema = Schema.Struct({
  _tag: Schema.tagDefaultOmit("GetConfiguration"),
  method: Schema.Literal("GET"),
  pathname: ConfigurationPathParserSchema,
});

const DeleteConfigurationRouteSchema = Schema.Struct({
  _tag: Schema.tagDefaultOmit("DeleteConfiguration"),
  method: Schema.Literal("DELETE"),
  pathname: ConfigurationPathParserSchema,
});

export const ApiRouteSchema = Schema.Union([
  EventsRouteSchema,
  GetConfigurationsRouteSchema,
  CreateConfigurationRouteSchema,
  GetConfigurationRouteSchema,
  DeleteConfigurationRouteSchema,
]);

export type ApiRoute = typeof ApiRouteSchema.Type;
