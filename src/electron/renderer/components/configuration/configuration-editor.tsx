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
import {
  type ConfigurationFingerprint,
  ConfigurationFingerprintSchema,
} from "@/validation/configuration/configuration-fingerprint.ts";

import {
  type ConfigurationOption,
  type DungeonOption,
} from "./configuration-editor-types.ts";
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
  readonly configurationOptions: ReadonlyArray<ConfigurationOption>;
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

function decodeConfigurationEditorValue(
  value: ConfigurationEditorValue,
): DecodedConfigurationEditorValue | undefined {
  const result = Schema.decodeUnknownResult(ConfigurationEditorSchema)(value);

  return Result.match(result, {
    onFailure: () => undefined,
    onSuccess: (decoded) => decoded,
  });
}

function hasConfigurationEditorChanged(
  value: ConfigurationEditorValue,
  defaultValue: ConfigurationEditorValue,
): boolean {
  return JSON.stringify(value) !== JSON.stringify(defaultValue);
}

export function ConfigurationEditor({
  configurationOptions,
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
    <main className="mx-auto grid w-full gap-8 p-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Fellowship Configuration
        </h1>

        <p className="text-sm text-muted-foreground">
          Select an existing configuration or edit the current configuration
          below.
        </p>
      </header>

      <div className="grid gap-x-6 gap-y-2 lg:grid-cols-[minmax(20rem,1fr)_auto]">
        <div className="grid min-w-0 content-start gap-2">
          <FieldLabel htmlFor="configuration-selection">
            Configuration
          </FieldLabel>

          <NativeSelect
            className="w-full min-w-64"
            id="configuration-selection"
            value={selectedConfigurationFingerprint ?? ""}
            onChange={(event) => {
              const result = Schema.decodeUnknownResult(
                ConfigurationFingerprintSchema,
              )(event.target.value);

              Result.match(result, {
                onFailure: (error) => {
                  console.error("Invalid configuration fingerprint.", error);
                },
                onSuccess: (fingerprint) => {
                  onSelectConfiguration(fingerprint);
                },
              });
            }}
          >
            <NativeSelectOption value="" disabled>
              Select a configuration
            </NativeSelectOption>

            {configurationOptions.map((configuration) => {
              return (
                <NativeSelectOption
                  key={configuration.fingerprint}
                  value={configuration.fingerprint}
                >
                  {configuration.label}
                </NativeSelectOption>
              );
            })}
          </NativeSelect>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-152 lg:self-end">
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

          <form.Subscribe selector={(state) => state.values}>
            {(value) => {
              const hasChanged = hasConfigurationEditorChanged(
                value,
                defaultValue,
              );

              return (
                <Button
                  disabled={!hasChanged}
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
          <form.Subscribe selector={(state) => state.values}>
            {(value) => {
              const saveState = resolveSaveState(value);
              const hasChanged = hasConfigurationEditorChanged(
                value,
                defaultValue,
              );

              const shouldShowSaveState =
                saveState !== undefined &&
                (hasChanged || selectedConfigurationFingerprint === null);

              if (!shouldShowSaveState) {
                return null;
              }

              return <ConfigurationSaveStateIndicator saveState={saveState} />;
            }}
          </form.Subscribe>
        </div>
      </div>

      <form
        className="grid gap-8"
        id={CONFIGURATION_FORM_DOM_ID}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();

          form.handleSubmit();
        }}
      >
        <form.Subscribe selector={(state) => state.values}>
          {(value) => {
            const saveState = resolveSaveState(value);
            const hasChanged = hasConfigurationEditorChanged(
              value,
              defaultValue,
            );

            const shouldHighlightSaveState =
              hasChanged || selectedConfigurationFingerprint === null;

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
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_10rem]">
                  <form.Field name="label">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isBlurred && !field.state.meta.isValid;

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

                  <form.Field name="dungeonId">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isBlurred && !field.state.meta.isValid;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Dungeon</FieldLabel>

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
                        field.state.meta.isBlurred && !field.state.meta.isValid;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Dungeon level
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

                <form.Field name="milestones" mode="array">
                  {(milestonesField) => {
                    return (
                      <section className="grid grid-cols-[repeat(auto-fit,minmax(22rem,1fr))] gap-4">
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
