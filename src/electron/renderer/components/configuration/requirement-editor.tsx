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
  const [selectedTarget, setSelectedTarget] = useState<string | undefined>();
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

        const selectedValue =
          selectedTarget ??
          (existingOption === undefined ? CUSTOM_TARGET : existingOption.value);

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
                setSelectedTarget(value);

                if (value === CUSTOM_TARGET) {
                  setIsCustomInputBlurred(false);
                  field.handleChange("");
                  return;
                }

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
                field.handleChange(event.target.value);
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

  return (
    <div className="grid gap-4 rounded-lg border bg-muted/30 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name={`${requirementPath}.type` as const}>
          {(field) => {
            const isInvalid =
              field.state.meta.isBlurred && !field.state.meta.isValid;

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
                      field.handleChange(
                        event.target.value as MilestoneRequirementEventType,
                      );
                    }}
                  >
                    {eventTypes.map((eventType) => {
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
                  eventType={field.state.value}
                  form={form}
                  requirementPath={requirementPath}
                />
              </>
            );
          }}
        </form.Field>

        <form.Field name={`${requirementPath}.startOccurrence` as const}>
          {(field) => {
            const isInvalid =
              field.state.meta.isBlurred && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Start occurrence</FieldLabel>

                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  inputMode="numeric"
                  min={1}
                  name={field.name}
                  type="number"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                  }}
                />

                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name={`${requirementPath}.requiredCount` as const}>
          {(field) => {
            const isInvalid =
              field.state.meta.isBlurred && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Required count</FieldLabel>

                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  inputMode="numeric"
                  min={1}
                  name={field.name}
                  type="number"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                  }}
                />

                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
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
