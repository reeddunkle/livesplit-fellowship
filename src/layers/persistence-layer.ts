import * as Layer from "effect/Layer";

import { AbilityDAOLive } from "@/db/daos/ability/ability-dao-live.ts";
import { ConfigurationDAOLive } from "@/db/daos/configuration/configuration-dao-live.ts";
import { DungeonDAOLive } from "@/db/daos/dungeon/dungeon-dao-live.ts";
import { EncounterDAOLive } from "@/db/daos/encounter/encounter-dao-live.ts";
import { UnitDAOLive } from "@/db/daos/unit/unit-dao-live.ts";
import { makeDatabaseLayer } from "@/db/database-layer.ts";
import { type DatabaseOptions } from "@/types/app-options.ts";

export type MakePersistenceLayerOptions = DatabaseOptions;

export function makePersistenceLayer({
  databaseFilename,
}: MakePersistenceLayerOptions) {
  const DatabaseLive = makeDatabaseLayer(databaseFilename);

  const DAOLive = Layer.mergeAll(
    AbilityDAOLive,
    ConfigurationDAOLive,
    DungeonDAOLive,
    EncounterDAOLive,
    UnitDAOLive,
  );

  return DAOLive.pipe(Layer.provideMerge(DatabaseLive));
}
