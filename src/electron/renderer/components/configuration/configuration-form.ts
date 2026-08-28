import { useForm } from "@tanstack/react-form";
import * as Schema from "effect/Schema";

import {
  ConfigurationEditorSchema,
  ConfigurationEditorStandardSchema,
  type ConfigurationEditorValue,
  type DecodedConfigurationEditorValue,
  type MilestoneEditorValue,
  type RequirementEditorValue,
} from "./configuration-form-schema.ts";

export const EMPTY_CONFIGURATION_EDITOR_VALUE: ConfigurationEditorValue = {
  dungeonId: "",
  dungeonLevel: "",
  label: "",
  milestones: [],
};

export function createRequirementEditorValue(): RequirementEditorValue {
  return {
    id: crypto.randomUUID(),
    requiredCount: "1",
    startOccurrence: "1",
    targetId: "",
    type: "UNIT_DEATH",
  };
}

export function createMilestoneEditorValue(): MilestoneEditorValue {
  return {
    id: crypto.randomUUID(),
    label: "",
    requirements: [],
  };
}

type UseConfigurationFormOptions = {
  readonly defaultValues: ConfigurationEditorValue;
  readonly onSubmit: (
    value: DecodedConfigurationEditorValue,
  ) => void | Promise<void>;
};

export function useConfigurationForm({
  defaultValues,
  onSubmit,
}: UseConfigurationFormOptions) {
  return useForm({
    defaultValues,

    onSubmit: async ({ value }) => {
      /*
       * Standard Schema validation does not replace TanStack Form's editable
       * values with Effect Schema's transformed output. Decode once more at
       * the submit boundary so numeric strings become actual numbers.
       */
      const decoded = Schema.decodeUnknownSync(ConfigurationEditorSchema)(
        value,
      );

      await onSubmit(decoded);
    },

    validators: {
      onBlur: ConfigurationEditorStandardSchema,
      onSubmit: ConfigurationEditorStandardSchema,
    },
  });
}

export type ConfigurationFormApi = ReturnType<typeof useConfigurationForm>;
