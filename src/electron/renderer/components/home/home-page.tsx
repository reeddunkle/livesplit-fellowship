import * as R from "effect/Record";
import { useMemo } from "react";

import { ConfigurationEditor } from "@/electron/renderer/components/configuration/configuration-editor.tsx";
import { createConfigurationEditorValue } from "@/electron/renderer/components/configuration/configuration-editor-adapter.ts";
import {
  type ConfigurationOption,
  type DungeonOption,
} from "@/electron/renderer/components/configuration/configuration-editor-types.ts";
import { EMPTY_CONFIGURATION_EDITOR_VALUE } from "@/electron/renderer/components/configuration/configuration-form.ts";
import { type DecodedConfigurationEditorValue } from "@/electron/renderer/components/configuration/configuration-form-schema.ts";
import { makeConfigurationSaveStateLookup } from "@/electron/renderer/components/configuration/configuration-save-state.ts";
import {
  ConfigurationProvider,
  useConfigurationActions,
  useConfigurations,
  useSelectedConfiguration,
  useSelectedConfigurationFingerprint,
} from "@/electron/renderer/stores/configurations-store/configurations-store.tsx";
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
import { type ConfigurationFingerprint } from "@/validation/configuration/configuration-fingerprint.ts";

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
      <ConfigurationProvider configurations={configurations}>
        <HomePageContent />
      </ConfigurationProvider>
    </FellowshipDataProvider>
  );
}

function HomePageContent() {
  const configurations = useConfigurations();
  const selectedConfiguration = useSelectedConfiguration();
  const selectedConfigurationFingerprint =
    useSelectedConfigurationFingerprint();

  const { deleteConfiguration, newConfiguration, save, selectConfiguration } =
    useConfigurationActions();

  const dungeons = useFellowshipDataStore((state) => state.dungeons);

  const configurationSaveState = useMemo(() => {
    return makeConfigurationSaveStateLookup(configurations);
  }, [configurations]);

  const dungeonsById = useMemo(() => {
    return R.fromIterableBy(dungeons, (dungeon) => dungeon.id);
  }, [dungeons]);

  const configurationOptions: ReadonlyArray<ConfigurationOption> =
    configurations.map((configuration) => {
      const dungeon = dungeonsById[configuration.dungeonId];

      const labelSuffix = `${
        dungeon?.name ?? configuration.dungeonId
      } ${configuration.dungeonLevel}`;

      return {
        fingerprint: configuration.fingerprint,
        label: `${configuration.label} (${labelSuffix})`,
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

  const handleDeleteConfiguration = (
    fingerprint: ConfigurationFingerprint,
  ): void => {
    deleteConfiguration(fingerprint);
  };

  const handleSelectConfiguration = (
    fingerprint: ConfigurationFingerprint | null,
  ): void => {
    if (fingerprint === null) {
      newConfiguration();
      return;
    }

    selectConfiguration(fingerprint);
  };

  const handleSubmit = (value: DecodedConfigurationEditorValue): void => {
    save(value);
  };

  return (
    <ConfigurationEditor
      key={selectedConfigurationFingerprint ?? "new"}
      configurationOptions={configurationOptions}
      defaultValue={defaultValue}
      dungeonOptions={dungeonOptions}
      eventTypes={eventTypes}
      getSaveState={configurationSaveState.get}
      onDeleteConfiguration={handleDeleteConfiguration}
      onSelectConfiguration={handleSelectConfiguration}
      onSubmit={handleSubmit}
      selectedConfigurationFingerprint={selectedConfigurationFingerprint}
    />
  );
}
