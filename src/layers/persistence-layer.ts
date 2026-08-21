import * as Layer from "effect/Layer";

import { ConfigurationStoreLive } from "@/db/configuration/configuration-store-live.ts";
import { makeDatabaseLayer } from "@/db/database-layer.ts";

export function makePersistenceLayer(databaseFilename: string) {
  const DatabaseLive = makeDatabaseLayer(databaseFilename);

  const PersistenceServicesLive = Layer.mergeAll(ConfigurationStoreLive);

  return PersistenceServicesLive.pipe(Layer.provideMerge(DatabaseLive));
}
