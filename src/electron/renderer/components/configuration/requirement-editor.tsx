import { XIcon } from "lucide-react";

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
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";

import { type ConfigurationFormApi } from "./configuration-form.ts";

type RequirementEditorProps = {
  readonly eventTypes: ReadonlyArray<MilestoneRequirementEventType>;
  readonly form: ConfigurationFormApi;
  readonly milestoneIndex: number;
  readonly onRemove: () => void;
  readonly requirementIndex: number;
};

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
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
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
            );
          }}
        </form.Field>

        <form.Field name={`${requirementPath}.targetId` as const}>
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Target ID</FieldLabel>

                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  inputMode="numeric"
                  name={field.name}
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

        <form.Field name={`${requirementPath}.startOccurrence` as const}>
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

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
              field.state.meta.isTouched && !field.state.meta.isValid;

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
