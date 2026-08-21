import * as Layer from "effect/Layer";

import { ConfigurationStoreLive } from "@/db/configuration/configuration-store-live.ts";
import { makeDatabaseLayer } from "@/db/database-layer.ts";
import { type DatabaseOptions } from "@/types/app-options.ts";

export type MakePersistenceLayerOptions = DatabaseOptions;

export function makePersistenceLayer({
  databaseFilename,
}: MakePersistenceLayerOptions) {
  const DatabaseLive = makeDatabaseLayer(databaseFilename);

  const PersistenceServicesLive = Layer.mergeAll(ConfigurationStoreLive);

  return PersistenceServicesLive.pipe(Layer.provideMerge(DatabaseLive));
}
