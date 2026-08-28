import { NonEmptyStringSchema } from "@/validation/common.ts";

export const ConfigurationLabelSchema = NonEmptyStringSchema;

export type ConfigurationLabel = typeof ConfigurationLabelSchema.Type;
