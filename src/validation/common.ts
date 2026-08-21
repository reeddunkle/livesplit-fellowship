import * as Schema from "effect/Schema";

export const BooleanFlagSchema = Schema.Union([
  Schema.Literal("0").transform(false),
  Schema.Literal("1").transform(true),
]);

export const NonEmptyStringSchema = Schema.String.check(Schema.isMinLength(1));

export const EmptyStringSchema = Schema.Literal("");

export const IntegerFromStringSchema = Schema.NumberFromString.pipe(
  Schema.decodeTo(Schema.Int),
);

export const JsonStringSchema = Schema.fromJsonString(Schema.String);

export const JsonStringArraySchema = Schema.fromJsonString(
  Schema.Array(Schema.String),
);

export const JsonIntegerArraySchema = Schema.fromJsonString(
  Schema.Array(Schema.Int),
);

export const PositiveIntegerSchema = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(1),
);
