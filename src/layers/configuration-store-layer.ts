import * as Layer from "effect/Layer";

import { ConfigurationStoreLive } from "@/db/configuration/configuration-store-live.ts";
import { makeDatabaseLayer } from "@/db/database-layer.ts";

export function makeConfigurationStoreLayer(databaseFilename: string) {
  return ConfigurationStoreLive.pipe(
    Layer.provideMerge(makeDatabaseLayer(databaseFilename)),
  );
}
