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

const ConfigurationsRouteSchema = Schema.Struct({
  _tag: Schema.tagDefaultOmit("Configurations"),
  method: Schema.Literal("GET"),
  pathname: Schema.Literal(ROUTES.configurations),
});

const ConfigurationRouteSchema = Schema.Struct({
  _tag: Schema.tagDefaultOmit("Configuration"),
  method: Schema.Literal("GET"),
  pathname: ConfigurationPathParserSchema,
});

export const ApiRouteSchema = Schema.Union([
  EventsRouteSchema,
  ConfigurationsRouteSchema,
  ConfigurationRouteSchema,
]);

export type ApiRoute = typeof ApiRouteSchema.Type;
