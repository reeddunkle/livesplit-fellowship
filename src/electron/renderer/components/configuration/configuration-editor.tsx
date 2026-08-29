import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { PlusIcon, RotateCcwIcon, SaveIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/electron/renderer/components/ui/button.tsx";
import { Card, CardContent } from "@/electron/renderer/components/ui/card.tsx";
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
import { type ConfigurationFingerprint } from "@/validation/configuration/configuration-fingerprint.ts";

import { type DungeonOption } from "./configuration-editor-types.ts";
import {
  createMilestoneEditorValue,
  useConfigurationForm,
} from "./configuration-form.ts";
import {
  ConfigurationEditorSchema,
  type ConfigurationEditorValue,
  type DecodedConfigurationEditorValue,
} from "./configuration-form-schema.ts";
import { type ConfigurationSaveState } from "./configuration-save-state.ts";
import { ConfigurationSaveStateIndicator } from "./configuration-save-state-indicator.tsx";
import { MilestoneEditor } from "./milestone-editor.tsx";

const CONFIGURATION_FORM_DOM_ID = "configuration-form";

type ConfigurationEditorProps = {
  readonly defaultValue: ConfigurationEditorValue;
  readonly dungeonOptions: ReadonlyArray<DungeonOption>;
  readonly eventTypes: ReadonlyArray<MilestoneRequirementEventType>;
  readonly getSaveState: (
    value: DecodedConfigurationEditorValue,
  ) => ConfigurationSaveState;
  readonly onDeleteConfiguration: (
    fingerprint: ConfigurationFingerprint,
  ) => void | Promise<void>;
  readonly onSelectConfiguration: (
    fingerprint: ConfigurationFingerprint | null,
  ) => void;
  readonly onSubmit: (
    value: DecodedConfigurationEditorValue,
  ) => void | Promise<void>;
  readonly selectedConfigurationFingerprint: ConfigurationFingerprint | null;
};

type ConfigurationEditorFormState = {
  readonly isDefaultValue: boolean;
  readonly isDirty: boolean;
  readonly isSubmitted: boolean;
  readonly values: ConfigurationEditorValue;
};

function decodeConfigurationEditorValue(
  value: ConfigurationEditorValue,
): DecodedConfigurationEditorValue | undefined {
  const result = Schema.decodeUnknownResult(ConfigurationEditorSchema)(value);

  return Result.match(result, {
    onFailure: () => undefined,
    onSuccess: (decoded) => decoded,
  });
}

function selectConfigurationEditorFormState(
  state: ConfigurationEditorFormState,
) {
  return {
    isDefaultValue: state.isDefaultValue,
    isDirty: state.isDirty,
    isSubmitted: state.isSubmitted,
    values: state.values,
  };
}

function hasUnsavedChanges({
  isDefaultValue,
  isDirty,
  isSubmitted,
}: Pick<
  ConfigurationEditorFormState,
  "isDefaultValue" | "isDirty" | "isSubmitted"
>): boolean {
  if (isDefaultValue) {
    return false;
  }

  if (isSubmitted && !isDirty) {
    return false;
  }

  return true;
}

export function ConfigurationEditor({
  defaultValue,
  dungeonOptions,
  eventTypes,
  getSaveState,
  onDeleteConfiguration,
  onSelectConfiguration,
  onSubmit,
  selectedConfigurationFingerprint,
}: ConfigurationEditorProps) {
  const form = useConfigurationForm({
    defaultValues: defaultValue,
    onSubmit,
  });

  const resolveSaveState = (
    value: ConfigurationEditorValue,
  ): ConfigurationSaveState | undefined => {
    const decoded = decodeConfigurationEditorValue(value);

    if (decoded === undefined) {
      return undefined;
    }

    return getSaveState(decoded);
  };

  return (
    <main className="mx-auto grid w-full gap-6 p-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Configure a run
        </h1>
        <p className="text-sm text-muted-foreground">
          Select a saved configuration from the sidebar or create a new one.
        </p>
      </header>
      <section className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onSelectConfiguration(null);
            }}
          >
            <PlusIcon />
            New
          </Button>
          <form.Subscribe selector={selectConfigurationEditorFormState}>
            {(state) => {
              const isResetEnabled = hasUnsavedChanges(state);

              return (
                <Button
                  disabled={!isResetEnabled}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                  }}
                >
                  <RotateCcwIcon />
                  Reset
                </Button>
              );
            }}
          </form.Subscribe>
          <Button
            disabled={selectedConfigurationFingerprint === null}
            type="button"
            variant="destructive"
            onClick={() => {
              if (selectedConfigurationFingerprint === null) {
                return;
              }

              onDeleteConfiguration(selectedConfigurationFingerprint);
            }}
          >
            <Trash2Icon />
            Delete
          </Button>
          <form.Subscribe
            selector={(state) => {
              return [state.canSubmit, state.isSubmitting] as const;
            }}
          >
            {([canSubmit, isSubmitting]) => {
              return (
                <Button
                  disabled={!canSubmit || isSubmitting}
                  form={CONFIGURATION_FORM_DOM_ID}
                  type="submit"
                >
                  <SaveIcon />
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              );
            }}
          </form.Subscribe>
        </div>
        <div className="min-h-6">
          <form.Subscribe selector={selectConfigurationEditorFormState}>
            {(state) => {
              if (!hasUnsavedChanges(state)) {
                return null;
              }

              const saveState = resolveSaveState(state.values);

              if (saveState === undefined) {
                return null;
              }

              return <ConfigurationSaveStateIndicator saveState={saveState} />;
            }}
          </form.Subscribe>
        </div>
      </section>
      <form
        className="grid gap-8"
        id={CONFIGURATION_FORM_DOM_ID}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();

          form.handleSubmit();
        }}
      >
        <form.Subscribe selector={selectConfigurationEditorFormState}>
          {(state) => {
            const saveState = resolveSaveState(state.values);
            const shouldHighlightSaveState = hasUnsavedChanges(state);

            const saveStateClassName = !shouldHighlightSaveState
              ? "border-border"
              : saveState?.type === "UPDATE"
                ? "border-amber-500/70"
                : saveState?.type === "CREATE"
                  ? "border-green-500/70"
                  : "border-border";

            return (
              <div
                className={`grid gap-8 rounded-xl border-2 p-4 transition-colors ${saveStateClassName}`}
              >
                <div className="grid gap-4">
                  <div className="w-full max-w-lg">
                    <form.Field name="label">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isBlurred &&
                          !field.state.meta.isValid;

                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Configuration label
                            </FieldLabel>

                            <Input
                              aria-invalid={isInvalid}
                              id={field.name}
                              name={field.name}
                              placeholder="My configuration"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(event) => {
                                field.handleChange(event.target.value);
                              }}
                            />

                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    </form.Field>
                  </div>
                  <div className="grid justify-start gap-4 md:grid-cols-[minmax(20rem,32rem)_10rem]">
                    <form.Field name="dungeonId">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isBlurred &&
                          !field.state.meta.isValid;

                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Dungeon
                            </FieldLabel>

                            <NativeSelect
                              aria-invalid={isInvalid}
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(event) => {
                                field.handleChange(event.target.value);
                              }}
                            >
                              <NativeSelectOption value="" disabled>
                                Select a dungeon
                              </NativeSelectOption>

                              {dungeonOptions.map((dungeon) => {
                                return (
                                  <NativeSelectOption
                                    key={dungeon.key}
                                    value={dungeon.key}
                                  >
                                    {dungeon.label}
                                  </NativeSelectOption>
                                );
                              })}
                            </NativeSelect>

                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    </form.Field>
                    <form.Field name="dungeonLevel">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isBlurred &&
                          !field.state.meta.isValid;

                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Eternal level
                            </FieldLabel>
                            <Input
                              aria-invalid={isInvalid}
                              id={field.name}
                              min={1}
                              name={field.name}
                              type="number"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(event) => {
                                field.handleChange(event.target.value);
                              }}
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    </form.Field>
                  </div>
                </div>
                <form.Field name="milestones" mode="array">
                  {(milestonesField) => {
                    return (
                      <section className="grid grid-cols-[repeat(auto-fit,minmax(22rem,28rem))] justify-start gap-4">
                        {milestonesField.state.value.map(
                          (milestone, milestoneIndex) => {
                            return (
                              <MilestoneEditor
                                eventTypes={eventTypes}
                                form={form}
                                key={milestone.id}
                                milestoneIndex={milestoneIndex}
                                onRemove={() => {
                                  milestonesField.removeValue(milestoneIndex);
                                }}
                              />
                            );
                          },
                        )}
                        <Card className="min-h-64 border-dashed">
                          <CardContent className="flex h-full min-h-64 items-center justify-center">
                            <Button
                              className="h-full min-h-48 w-full border-dashed"
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                milestonesField.pushValue(
                                  createMilestoneEditorValue(),
                                );
                              }}
                            >
                              <PlusIcon />
                              Add milestone
                            </Button>
                          </CardContent>
                        </Card>
                      </section>
                    );
                  }}
                </form.Field>
              </div>
            );
          }}
        </form.Subscribe>
      </form>
    </main>
  );
}
