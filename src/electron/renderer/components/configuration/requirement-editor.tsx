import * as Match from "effect/Match";
import * as R from "effect/Record";
import { XIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/electron/renderer/components/ui/button.tsx";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/electron/renderer/components/ui/field.tsx";
import { Input } from "@/electron/renderer/components/ui/input.tsx";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/electron/renderer/components/ui/native-select.tsx";
import { useFellowshipDataStore } from "@/electron/renderer/stores/fellowship-data/fellowship-data-store.tsx";
import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";

import { type ConfigurationFormApi } from "./configuration-form.ts";
import { getSuggestedRequirementValues } from "./helpers/get-suggested-requirement-values.ts";

const CUSTOM_TARGET = "__CUSTOM__" as const;

type RequirementEditorProps = {
  readonly eventTypes: ReadonlyArray<MilestoneRequirementEventType>;
  readonly form: ConfigurationFormApi;
  readonly milestoneIndex: number;
  readonly onRemove: () => void;
  readonly requirementIndex: number;
};

type TargetOption = {
  readonly label: string;
  readonly value: string;
};

type RequirementTargetFieldProps = {
  readonly eventType: MilestoneRequirementEventType;
  readonly form: ConfigurationFormApi;
  readonly requirementPath: `milestones[${number}].requirements[${number}]`;
};

type TargetSelectProps = {
  readonly id: string;
  readonly isInvalid: boolean;
  readonly name: string;
  readonly options: ReadonlyArray<TargetOption>;
  readonly value: string;
  readonly onBlur: () => void;
  readonly onChange: (value: string) => void;
};

function TargetSelect({
  id,
  isInvalid,
  name,
  onBlur,
  onChange,
  options,
  value,
}: TargetSelectProps) {
  return (
    <NativeSelect
      aria-invalid={isInvalid}
      id={id}
      name={name}
      value={value}
      onBlur={onBlur}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    >
      <NativeSelectOption value={CUSTOM_TARGET}>Custom</NativeSelectOption>

      {options.map((option) => {
        return (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        );
      })}
    </NativeSelect>
  );
}

function RequirementTargetField({
  eventType,
  form,
  requirementPath,
}: RequirementTargetFieldProps) {
  const [customTargetValue, setCustomTargetValue] = useState<
    string | undefined
  >();

  const [isCustomInputBlurred, setIsCustomInputBlurred] = useState(false);

  const abilities = useFellowshipDataStore((state) => state.abilities);
  const dungeons = useFellowshipDataStore((state) => state.dungeons);
  const encounters = useFellowshipDataStore((state) => state.encounters);
  const units = useFellowshipDataStore((state) => state.units);

  const options = Match.value(eventType).pipe(
    Match.when(FELLOWSHIP_EVENT.ABILITY_ACTIVATED, () => {
      return abilities.map((ability) => {
        return {
          label: ability.name,
          value: ability.id,
        };
      });
    }),
    Match.whenOr(
      FELLOWSHIP_EVENT.DUNGEON_START,
      FELLOWSHIP_EVENT.DUNGEON_END,
      () => {
        return dungeons.map((dungeon) => {
          return {
            label: dungeon.name,
            value: dungeon.id,
          };
        });
      },
    ),
    Match.whenOr(
      FELLOWSHIP_EVENT.ENCOUNTER_START,
      FELLOWSHIP_EVENT.ENCOUNTER_END,
      () => {
        return encounters.map((encounter) => {
          return {
            label: encounter.name,
            value: encounter.id,
          };
        });
      },
    ),
    Match.when(FELLOWSHIP_EVENT.UNIT_DEATH, () => {
      return units.map((unit) => {
        return {
          label: unit.name,
          value: unit.id,
        };
      });
    }),
    Match.exhaustive,
  );

  const optionsByValue = R.fromIterableBy(options, (option) => option.value);

  return (
    <form.Field name={`${requirementPath}.targetId` as const}>
      {(field) => {
        const existingOption = optionsByValue[field.state.value];

        /*
         * A custom target override is only active while it still matches the
         * current form value. If form.reset() changes the field externally,
         * the form value becomes authoritative again automatically.
         */
        const isCustomOverride =
          customTargetValue !== undefined &&
          customTargetValue === field.state.value;

        const selectedValue = isCustomOverride
          ? CUSTOM_TARGET
          : (existingOption?.value ?? CUSTOM_TARGET);

        const isCustom = selectedValue === CUSTOM_TARGET;

        const isInvalid =
          !field.state.meta.isValid &&
          (isCustom ? isCustomInputBlurred : field.state.meta.isBlurred);

        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={`${field.name}-select`}>Target</FieldLabel>

            <TargetSelect
              id={`${field.name}-select`}
              isInvalid={!isCustom && isInvalid}
              name={`${field.name}-select`}
              options={options}
              value={selectedValue}
              onBlur={field.handleBlur}
              onChange={(value) => {
                if (value === CUSTOM_TARGET) {
                  setCustomTargetValue("");
                  setIsCustomInputBlurred(false);
                  field.handleChange("");
                  return;
                }

                setCustomTargetValue(undefined);
                setIsCustomInputBlurred(false);

                const option = optionsByValue[value];

                if (option !== undefined) {
                  field.handleChange(option.value);
                }
              }}
            />

            <Input
              aria-invalid={isInvalid}
              disabled={!isCustom}
              id={field.name}
              inputMode="numeric"
              name={field.name}
              placeholder="Target ID"
              value={field.state.value}
              onBlur={() => {
                if (isCustom) {
                  setIsCustomInputBlurred(true);
                }

                field.handleBlur();
              }}
              onChange={(event) => {
                const value = event.target.value;

                setCustomTargetValue(value);
                field.handleChange(value);
              }}
            />

            {isInvalid && <FieldError errors={field.state.meta.errors} />}
          </Field>
        );
      }}
    </form.Field>
  );
}

export function RequirementEditor({
  eventTypes,
  form,
  milestoneIndex,
  onRemove,
  requirementIndex,
}: RequirementEditorProps) {
  const requirementPath =
    `milestones[${milestoneIndex}].requirements[${requirementIndex}]` as const;

  const selectableEventTypes = eventTypes.filter((eventType) => {
    return (
      eventType !== FELLOWSHIP_EVENT.DUNGEON_START &&
      eventType !== FELLOWSHIP_EVENT.DUNGEON_END
    );
  });

  return (
    <div className="grid gap-4 rounded-lg border bg-muted/30 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name={`${requirementPath}.type` as const}>
          {(field) => {
            const isInvalid =
              field.state.meta.isBlurred && !field.state.meta.isValid;

            const showOccurrenceFields =
              field.state.value === FELLOWSHIP_EVENT.UNIT_DEATH;

            return (
              <>
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Event type</FieldLabel>

                  <NativeSelect
                    aria-invalid={isInvalid}
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      const eventType = event.target
                        .value as MilestoneRequirementEventType;

                      const currentRequirement =
                        form.state.values.milestones[milestoneIndex]
                          ?.requirements[requirementIndex];

                      const suggestedValues = getSuggestedRequirementValues({
                        eventType,
                        milestoneIndex,
                        requirementIndex,
                        value: form.state.values,
                      });

                      field.handleChange(eventType);

                      if (
                        currentRequirement?.targetId === "" &&
                        suggestedValues.targetId !== undefined
                      ) {
                        form.setFieldValue(
                          `${requirementPath}.targetId`,
                          suggestedValues.targetId,
                        );
                      }

                      if (suggestedValues.startOccurrence !== undefined) {
                        console.log("Setting startOccurrence.");
                        form.setFieldValue(
                          `${requirementPath}.startOccurrence`,
                          suggestedValues.startOccurrence,
                        );
                      }

                      if (suggestedValues.requiredCount !== undefined) {
                        form.setFieldValue(
                          `${requirementPath}.requiredCount`,
                          suggestedValues.requiredCount,
                        );
                      }
                    }}
                  >
                    {selectableEventTypes.map((eventType) => {
                      return (
                        <NativeSelectOption key={eventType} value={eventType}>
                          {eventType}
                        </NativeSelectOption>
                      );
                    })}
                  </NativeSelect>

                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>

                <RequirementTargetField
                  key={field.state.value}
                  eventType={field.state.value}
                  form={form}
                  requirementPath={requirementPath}
                />

                {showOccurrenceFields && (
                  <>
                    <form.Field
                      name={`${requirementPath}.startOccurrence` as const}
                    >
                      {(startOccurrenceField) => {
                        const isStartOccurrenceInvalid =
                          startOccurrenceField.state.meta.isBlurred &&
                          !startOccurrenceField.state.meta.isValid;

                        return (
                          <Field data-invalid={isStartOccurrenceInvalid}>
                            <FieldLabel htmlFor={startOccurrenceField.name}>
                              Start occurrence
                            </FieldLabel>

                            <Input
                              aria-invalid={isStartOccurrenceInvalid}
                              id={startOccurrenceField.name}
                              inputMode="numeric"
                              min={1}
                              name={startOccurrenceField.name}
                              type="number"
                              value={startOccurrenceField.state.value}
                              onBlur={startOccurrenceField.handleBlur}
                              onChange={(event) => {
                                startOccurrenceField.handleChange(
                                  event.target.value,
                                );
                              }}
                            />

                            {isStartOccurrenceInvalid && (
                              <FieldError
                                errors={startOccurrenceField.state.meta.errors}
                              />
                            )}
                          </Field>
                        );
                      }}
                    </form.Field>

                    <form.Field
                      name={`${requirementPath}.requiredCount` as const}
                    >
                      {(requiredCountField) => {
                        const isRequiredCountInvalid =
                          requiredCountField.state.meta.isBlurred &&
                          !requiredCountField.state.meta.isValid;

                        return (
                          <Field data-invalid={isRequiredCountInvalid}>
                            <FieldLabel htmlFor={requiredCountField.name}>
                              Required count
                            </FieldLabel>

                            <Input
                              aria-invalid={isRequiredCountInvalid}
                              id={requiredCountField.name}
                              inputMode="numeric"
                              min={1}
                              name={requiredCountField.name}
                              type="number"
                              value={requiredCountField.state.value}
                              onBlur={requiredCountField.handleBlur}
                              onChange={(event) => {
                                requiredCountField.handleChange(
                                  event.target.value,
                                );
                              }}
                            />

                            {isRequiredCountInvalid && (
                              <FieldError
                                errors={requiredCountField.state.meta.errors}
                              />
                            )}
                          </Field>
                        );
                      }}
                    </form.Field>
                  </>
                )}
              </>
            );
          }}
        </form.Field>
      </div>

      <div className="flex justify-end">
        <Button
          aria-label="Remove requirement"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={onRemove}
        >
          <XIcon />
        </Button>
      </div>
    </div>
  );
}
