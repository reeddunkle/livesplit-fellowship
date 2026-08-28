import * as E from "effect/Effect";
import * as R from "effect/Record";
import { useState } from "react";

import { saveConfiguration } from "@/electron/renderer/api/configuration-client.ts";
import { ConfigurationEditor } from "@/electron/renderer/components/configuration/configuration-editor.tsx";
import {
  createConfigurationEditorValue,
  saveConfigurationApiRequest,
} from "@/electron/renderer/components/configuration/configuration-editor-adapter.ts";
import {
  type ConfigurationOption,
  type DungeonOption,
} from "@/electron/renderer/components/configuration/configuration-editor-types.ts";
import { EMPTY_CONFIGURATION_EDITOR_VALUE } from "@/electron/renderer/components/configuration/configuration-form.ts";
import { type DecodedConfigurationEditorValue } from "@/electron/renderer/components/configuration/configuration-form-schema.ts";
import {
  FellowshipDataProvider,
  useFellowshipDataStore,
} from "@/electron/renderer/stores/fellowship-data/fellowship-data-store.tsx";
import { type AbilityApiAbilityList } from "@/services/api/ability/ability-api-schema.ts";
import { type ConfigurationApiConfigurationList } from "@/services/api/configuration/configuration-api-schema.ts";
import { type DungeonApiDungeonList } from "@/services/api/dungeon/dungeon-api-schema.ts";
import { type EncounterApiEncounterList } from "@/services/api/encounter/encounter-api-schema.ts";
import { type UnitApiUnitList } from "@/services/api/unit/unit-api-schema.ts";
import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";

const eventTypes = [
  FELLOWSHIP_EVENT.ABILITY_ACTIVATED,
  FELLOWSHIP_EVENT.DUNGEON_START,
  FELLOWSHIP_EVENT.DUNGEON_END,
  FELLOWSHIP_EVENT.ENCOUNTER_START,
  FELLOWSHIP_EVENT.ENCOUNTER_END,
  FELLOWSHIP_EVENT.UNIT_DEATH,
] satisfies ReadonlyArray<MilestoneRequirementEventType>;

type HomePageProps = {
  readonly abilities: AbilityApiAbilityList;
  readonly configurations: ConfigurationApiConfigurationList;
  readonly dungeons: DungeonApiDungeonList;
  readonly encounters: EncounterApiEncounterList;
  readonly units: UnitApiUnitList;
};

type HomePageContentProps = {
  readonly configurations: ConfigurationApiConfigurationList;
};

export function HomePage({
  abilities,
  configurations,
  dungeons,
  encounters,
  units,
}: HomePageProps) {
  return (
    <FellowshipDataProvider
      abilities={abilities}
      dungeons={dungeons}
      encounters={encounters}
      units={units}
    >
      <HomePageContent configurations={configurations} />
    </FellowshipDataProvider>
  );
}

function HomePageContent({ configurations }: HomePageContentProps) {
  const dungeons = useFellowshipDataStore((state) => state.dungeons);

  const [selectedConfigurationId, setSelectedConfigurationId] = useState<
    string | null
  >(null);

  const configurationsById = R.fromIterableBy(
    configurations,
    (configuration) => configuration.id,
  );

  const selectedConfiguration =
    selectedConfigurationId === null
      ? undefined
      : configurationsById[selectedConfigurationId];

  const dungeonsById = new Map(
    dungeons.map((dungeon) => {
      return [dungeon.id, dungeon] as const;
    }),
  );

  const configurationOptions: ReadonlyArray<ConfigurationOption> =
    configurations.map((configuration) => {
      const dungeon = dungeonsById.get(configuration.dungeonId);

      return {
        id: configuration.id,
        label: `${dungeon?.name ?? configuration.dungeonId} — Level ${
          configuration.dungeonLevel
        }`,
      };
    });

  const dungeonOptions: ReadonlyArray<DungeonOption> = dungeons.map(
    (dungeon) => {
      return {
        key: dungeon.id,
        label: dungeon.name,
      };
    },
  );

  const defaultValue =
    selectedConfiguration === undefined
      ? EMPTY_CONFIGURATION_EDITOR_VALUE
      : createConfigurationEditorValue(selectedConfiguration);

  const handleSubmit = async (
    value: DecodedConfigurationEditorValue,
  ): Promise<void> => {
    if (selectedConfigurationId !== null) {
      throw new Error("Updating configurations is not implemented yet.");
    }

    yieldCreateConfiguration(value);
  };

  return (
    <ConfigurationEditor
      key={selectedConfigurationId ?? "new"}
      configurationOptions={configurationOptions}
      defaultValue={defaultValue}
      dungeonOptions={dungeonOptions}
      eventTypes={eventTypes}
      onSelectConfiguration={setSelectedConfigurationId}
      onSubmit={handleSubmit}
      selectedConfigurationId={selectedConfigurationId}
    />
  );
}

async function yieldCreateConfiguration(
  value: DecodedConfigurationEditorValue,
): Promise<void> {
  const request = saveConfigurationApiRequest(value);

  await E.runPromise(
    saveConfiguration({
      request,
    }),
  );
}
