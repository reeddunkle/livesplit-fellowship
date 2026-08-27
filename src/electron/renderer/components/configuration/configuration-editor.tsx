import { PlusIcon } from "lucide-react";

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
  type ConfigurationOption,
  type DungeonOption,
} from "./configuration-editor-types.ts";
import {
  createMilestoneEditorValue,
  useConfigurationForm,
} from "./configuration-form.ts";
import {
  type ConfigurationEditorValue,
  type DecodedConfigurationEditorValue,
} from "./configuration-form-schema.ts";
import { MilestoneEditor } from "./milestone-editor.tsx";

const CONFIGURATION_FORM_DOM_ID = "configuration-form";

type ConfigurationEditorProps = {
  readonly configurationOptions: ReadonlyArray<ConfigurationOption>;
  readonly defaultValue: ConfigurationEditorValue;
  readonly dungeonOptions: ReadonlyArray<DungeonOption>;
  readonly eventTypes: ReadonlyArray<MilestoneRequirementEventType>;
  readonly onSelectConfiguration: (configurationId: string | null) => void;
  readonly onSubmit: (
    value: DecodedConfigurationEditorValue,
  ) => void | Promise<void>;
  readonly selectedConfigurationId: string | null;
};

export function ConfigurationEditor({
  configurationOptions,
  defaultValue,
  dungeonOptions,
  eventTypes,
  onSelectConfiguration,
  onSubmit,
  selectedConfigurationId,
}: ConfigurationEditorProps) {
  const form = useConfigurationForm({
    defaultValues: defaultValue,
    onSubmit,
  });

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 p-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Fellowship Configuration
        </h1>

        <p className="text-sm text-muted-foreground">
          Select an existing configuration or edit the current configuration
          below.
        </p>
      </header>

      <div className="grid gap-2">
        <FieldLabel htmlFor="configuration-selection">Configuration</FieldLabel>

        <NativeSelect
          id="configuration-selection"
          value={selectedConfigurationId ?? ""}
          onChange={(event) => {
            onSelectConfiguration(
              event.target.value === "" ? null : event.target.value,
            );
          }}
        >
          <NativeSelectOption value="">New configuration</NativeSelectOption>

          {configurationOptions.map((configuration) => {
            return (
              <NativeSelectOption
                key={configuration.id}
                value={configuration.id}
              >
                {configuration.label}
              </NativeSelectOption>
            );
          })}
        </NativeSelect>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="dungeonId">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

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

                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="dungeonLevel">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Dungeon level</FieldLabel>

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

                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        </div>

        <form.Field name="milestones" mode="array">
          {(milestonesField) => {
            return (
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                        milestonesField.pushValue(createMilestoneEditorValue());
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

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
            }}
          >
            Reset
          </Button>

          <form.Subscribe
            selector={(state) => {
              return [state.canSubmit, state.isSubmitting] as const;
            }}
          >
            {([canSubmit, isSubmitting]) => {
              return (
                <Button disabled={!canSubmit || isSubmitting} type="submit">
                  {isSubmitting ? "Saving..." : "Save configuration"}
                </Button>
              );
            }}
          </form.Subscribe>
        </div>
      </form>
    </main>
  );
}
