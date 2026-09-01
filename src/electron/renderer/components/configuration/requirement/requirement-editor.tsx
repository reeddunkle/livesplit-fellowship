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
import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";

import { useConfigurationEditor } from "../configuration-editor-provider.tsx";
import { type ConfigurationFormApi } from "../configuration-form.ts";
import { type RequirementLocation } from "../helpers/configuration-editor-metadata.ts";
import { RequirementTargetField } from "./requirement-target-field.tsx";

type RequirementEditorProps = {
  readonly autoFocus?: boolean;
  readonly eventTypes: ReadonlyArray<MilestoneRequirementEventType>;
  readonly form: ConfigurationFormApi;
  readonly milestoneIndex: number;
  readonly onRemove: () => void;
  readonly requirementIndex: number;
};

export function RequirementEditor({
  autoFocus = false,
  eventTypes,
  form,
  milestoneIndex,
  onRemove,
  requirementIndex,
}: RequirementEditorProps) {
  const {
    focusedRequirementMetadata,
    getRequirementValuesForEventType,
    setFocusedRequirement,
  } = useConfigurationEditor();

  const requirementPath =
    `milestones[${milestoneIndex}].requirements[${requirementIndex}]` as const;

  const location = {
    milestoneIndex,
    requirementIndex,
  } satisfies RequirementLocation;

  const requirement =
    form.state.values.milestones[milestoneIndex]?.requirements[
      requirementIndex
    ];

  const matchesFocusedRequirement =
    requirement !== undefined &&
    focusedRequirementMetadata !== undefined &&
    focusedRequirementMetadata.targetId !== "" &&
    requirement.type === focusedRequirementMetadata.eventType &&
    requirement.targetId === focusedRequirementMetadata.targetId;

  const selectableEventTypes = eventTypes.filter((eventType) => {
    return (
      eventType !== FELLOWSHIP_EVENT.DUNGEON_START &&
      eventType !== FELLOWSHIP_EVENT.DUNGEON_END
    );
  });

  return (
    <fieldset
      className="grid gap-4 rounded-lg border bg-muted/30 p-4 transition-[border-color,box-shadow,background-color] data-[matches-focused-requirement=true]:border-primary/60 data-[matches-focused-requirement=true]:bg-primary/5 data-[matches-focused-requirement=true]:ring-2 data-[matches-focused-requirement=true]:ring-primary/20"
      data-matches-focused-requirement={matchesFocusedRequirement}
      onBlurCapture={(event) => {
        const nextFocusedElement = event.relatedTarget;

        if (
          nextFocusedElement instanceof Node &&
          event.currentTarget.contains(nextFocusedElement)
        ) {
          return;
        }

        setFocusedRequirement(undefined);
      }}
      onFocusCapture={() => {
        setFocusedRequirement(location);
      }}
      onPointerDownCapture={() => {
        setFocusedRequirement(location);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name={`${requirementPath}.type` as const}>
          {(field) => {
            const isInvalid = !field.state.meta.isValid;
            const showError = isInvalid && field.state.meta.isBlurred;

            const showOccurrenceFields =
              field.state.value === FELLOWSHIP_EVENT.UNIT_DEATH;

            return (
              <>
                <Field data-invalid={showError}>
                  <FieldLabel htmlFor={field.name}>Event type</FieldLabel>
                  <NativeSelect
                    aria-invalid={isInvalid}
                    autoFocus={autoFocus}
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      const eventType = event.target
                        .value as MilestoneRequirementEventType;

                      const requirementValues =
                        getRequirementValuesForEventType({
                          eventType,
                          location,
                        });

                      field.handleChange(eventType);

                      form.setFieldValue(
                        `${requirementPath}.targetId`,
                        requirementValues.targetId,
                      );

                      form.setFieldValue(
                        `${requirementPath}.startOccurrence`,
                        requirementValues.startOccurrence,
                      );

                      form.setFieldValue(
                        `${requirementPath}.requiredCount`,
                        requirementValues.requiredCount,
                      );
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
                  {showError && <FieldError errors={field.state.meta.errors} />}
                </Field>
                <RequirementTargetField
                  eventType={field.state.value}
                  form={form}
                  key={field.state.value}
                  location={location}
                  requirementPath={requirementPath}
                />
                {showOccurrenceFields && (
                  <>
                    <form.Field
                      name={`${requirementPath}.startOccurrence` as const}
                    >
                      {(startOccurrenceField) => {
                        const isInvalid =
                          !startOccurrenceField.state.meta.isValid;
                        const showError =
                          isInvalid &&
                          startOccurrenceField.state.meta.isBlurred;

                        return (
                          <Field data-invalid={showError}>
                            <FieldLabel htmlFor={startOccurrenceField.name}>
                              Start occurrence
                            </FieldLabel>
                            <Input
                              aria-invalid={isInvalid}
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
                            {showError && (
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
                        const isInvalid =
                          !requiredCountField.state.meta.isValid;
                        const showError =
                          isInvalid && requiredCountField.state.meta.isBlurred;

                        return (
                          <Field data-invalid={showError}>
                            <FieldLabel htmlFor={requiredCountField.name}>
                              Count
                            </FieldLabel>
                            <Input
                              aria-invalid={isInvalid}
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
                            {showError && (
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
    </fieldset>
  );
}
