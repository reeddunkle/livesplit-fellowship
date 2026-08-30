import { useForm } from "@tanstack/react-form";
import * as Match from "effect/Match";
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
import { type SuggestedRequirementValues } from "./helpers/get-suggested-requirement-values.ts";

export const EMPTY_CONFIGURATION_EDITOR_VALUE: ConfigurationEditorValue = {
  dungeonId: "",
  dungeonLevel: "",
  label: "",
  milestones: [],
};

type CreateRequirementEditorValueOptions = {
  readonly suggestedValues?: SuggestedRequirementValues;
};

export type ConfigurationSubmitType = "SAVE" | "UPDATE";

export type ConfigurationSubmitMeta = {
  readonly type: ConfigurationSubmitType;
};

export function createRequirementEditorValue({
  suggestedValues = {},
}: CreateRequirementEditorValueOptions = {}): RequirementEditorValue {
  const type = FELLOWSHIP_EVENT.UNIT_DEATH;

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
  readonly onSave: (
    value: DecodedConfigurationEditorValue,
  ) => void | Promise<void>;
  readonly onUpdate: (
    value: DecodedConfigurationEditorValue,
  ) => void | Promise<void>;
};

export function useConfigurationForm({
  defaultValues,
  onSave,
  onUpdate,
}: UseConfigurationFormOptions) {
  return useForm({
    defaultValues,

    onSubmit: async ({ meta, value }) => {
      /*
       * Standard Schema validation does not replace TanStack Form's editable
       * values with Effect Schema's transformed output. Decode once more at
       * the submit boundary so numeric strings become actual numbers.
       */
      const decoded = Schema.decodeUnknownSync(ConfigurationEditorSchema)(
        value,
      );

      await Match.value(meta).pipe(
        Match.when({ type: "SAVE" }, () => onSave(decoded)),
        Match.when({ type: "UPDATE" }, () => onUpdate(decoded)),
        Match.exhaustive,
      );
    },

    onSubmitMeta: {} as ConfigurationSubmitMeta,

    validators: {
      onChange: ConfigurationEditorStandardSchema,
      onSubmit: ConfigurationEditorStandardSchema,
    },
  });
}

export type ConfigurationFormApi = ReturnType<typeof useConfigurationForm>;
