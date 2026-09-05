import * as R from "effect/Record";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useState,
} from "react";
import { createStore, useStore } from "zustand";

import {
  createRequirementTargetsByEventType,
  type RequirementTargetsByEventType,
} from "@/electron/renderer/stores/fellowship-data/create-requirement-target-data.ts";
import {
  type AbilityApiAbility,
  type AbilityApiAbilityList,
} from "@/services/api/ability/ability-api-schema.ts";
import {
  type DungeonApiDungeon,
  type DungeonApiDungeonList,
} from "@/services/api/dungeon/dungeon-api-schema.ts";
import {
  type EncounterApiEncounter,
  type EncounterApiEncounterList,
} from "@/services/api/encounter/encounter-api-schema.ts";
import {
  type UnitApiUnit,
  type UnitApiUnitList,
} from "@/services/api/unit/unit-api-schema.ts";

export type FellowshipDataStoreProps = {
  readonly abilities: AbilityApiAbilityList;
  readonly dungeons: DungeonApiDungeonList;
  readonly encounters: EncounterApiEncounterList;
  readonly units: UnitApiUnitList;
};

export type FellowshipDataStoreState = FellowshipDataStoreProps & {
  readonly abilitiesById: Readonly<Record<string, AbilityApiAbility>>;
  readonly dungeonsById: Readonly<Record<string, DungeonApiDungeon>>;
  readonly encountersById: Readonly<Record<string, EncounterApiEncounter>>;
  readonly requirementTargetsByEventType: RequirementTargetsByEventType;
  readonly unitsById: Readonly<Record<string, UnitApiUnit>>;
};

export function createFellowshipDataStore(props: FellowshipDataStoreProps) {
  return createStore<FellowshipDataStoreState>()(() => {
    return {
      ...props,
      abilitiesById: R.fromIterableBy(props.abilities, (ability) => {
        return ability.id;
      }),
      dungeonsById: R.fromIterableBy(props.dungeons, (dungeon) => {
        return dungeon.id;
      }),
      encountersById: R.fromIterableBy(props.encounters, (encounter) => {
        return encounter.id;
      }),
      requirementTargetsByEventType: createRequirementTargetsByEventType(props),
      unitsById: R.fromIterableBy(props.units, (unit) => {
        return unit.id;
      }),
    };
  });
}

export type FellowshipDataStore = ReturnType<typeof createFellowshipDataStore>;

export const FellowshipDataContext = createContext<FellowshipDataStore | null>(
  null,
);

export type FellowshipDataProviderProps =
  PropsWithChildren<FellowshipDataStoreProps>;

export function FellowshipDataProvider({
  abilities,
  children,
  dungeons,
  encounters,
  units,
}: FellowshipDataProviderProps) {
  const [store] = useState(() => {
    return createFellowshipDataStore({
      abilities,
      dungeons,
      encounters,
      units,
    });
  });

  return (
    <FellowshipDataContext.Provider value={store}>
      {children}
    </FellowshipDataContext.Provider>
  );
}

export function useFellowshipDataStore<T>(
  selector: (state: FellowshipDataStoreState) => T,
): T {
  const store = useContext(FellowshipDataContext);

  if (store === null) {
    throw new Error(
      "Missing FellowshipDataContext.Provider in the component tree.",
    );
  }

  return useStore(store, selector);
}
