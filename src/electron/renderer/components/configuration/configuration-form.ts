import { useForm } from "@tanstack/react-form";
import * as Schema from "effect/Schema";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";

import {
  ConfigurationEditorSchema,
  ConfigurationEditorStandardSchema,
  type ConfigurationEditorValue,
  type DecodedConfigurationEditorValue,
  type MilestoneEditorValue,
  type RequirementEditorValue,
} from "./configuration-form-schema.ts";
import { getSuggestedRequirementValues } from "./get-suggested-requirement-values.ts";

export const EMPTY_CONFIGURATION_EDITOR_VALUE: ConfigurationEditorValue = {
  dungeonId: "",
  dungeonLevel: "",
  label: "",
  milestones: [],
};

type CreateRequirementEditorValueOptions = {
  readonly milestoneIndex: number;
  readonly requirementIndex: number;
  readonly value: ConfigurationEditorValue;
};

export function createRequirementEditorValue({
  milestoneIndex,
  requirementIndex,
  value,
}: CreateRequirementEditorValueOptions): RequirementEditorValue {
  const type = FELLOWSHIP_EVENT.UNIT_DEATH;

  const suggestedValues = getSuggestedRequirementValues({
    eventType: type,
    milestoneIndex,
    requirementIndex,
    value,
  });

  return {
    id: crypto.randomUUID(),
    requiredCount: suggestedValues.requiredCount ?? "1",
    startOccurrence: suggestedValues.startOccurrence ?? "1",
    targetId: suggestedValues.targetId ?? "",
    type,
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
