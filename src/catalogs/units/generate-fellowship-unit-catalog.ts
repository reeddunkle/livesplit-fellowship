import * as A from "effect/Array";
import * as E from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Order from "effect/Order";
import * as Schema from "effect/Schema";

import {
  type ExternalMobData,
  ExternalMobDataSchema,
} from "@/catalogs/external-mob-data-schema.ts";
import {
  type FellowshipUnitCatalog,
  FellowshipUnitCatalogSchema,
} from "@/catalogs/fellowship-unit-catalog-schema.ts";
import { parseJson } from "@/util/parse-json.ts";

const OUTPUT_FILE_PATH = "./src/catalogs/fellowship-unit-catalog.json";

const NumericStringOrder = Order.mapInput(Order.Number, (value: string) =>
  Number(value),
);

const UnitCatalogEntryOrder = Order.mapInput(
  NumericStringOrder,
  (entry: FellowshipUnitCatalog[number]) => entry.id,
);

function createUnitCatalog(
  externalMobData: ExternalMobData,
): FellowshipUnitCatalog {
  const catalog = Object.entries(externalMobData).map(([id, mob]) => {
    const dungeonIds = Array.from(
      new Set(
        mob.FoundInZoneGameIDs.map((dungeonId) => {
          return String(dungeonId);
        }),
      ),
    );

    return {
      dungeonIds: A.sort(dungeonIds, NumericStringOrder),
      id,
      name: mob.FSLName,
    };
  });

  return A.sort(catalog, UnitCatalogEntryOrder);
}

export const generateFellowshipUnitCatalog = E.fn(
  "generate-fellowship-unit-catalog",
)(function* (inputFilePath: string) {
  const fileSystem = yield* FileSystem.FileSystem;

  const contents = yield* fileSystem.readFileString(inputFilePath);

  const json = yield* parseJson({
    contents,
    onError: (cause) => {
      return cause instanceof Error
        ? cause
        : new Error("Failed to parse external mob data.");
    },
  });

  const externalMobData = yield* Schema.decodeUnknownEffect(
    ExternalMobDataSchema,
  )(json);

  const catalog = createUnitCatalog(externalMobData);

  const validatedCatalog = yield* Schema.decodeUnknownEffect(
    FellowshipUnitCatalogSchema,
  )(catalog);

  yield* fileSystem.writeFileString(
    OUTPUT_FILE_PATH,
    `${JSON.stringify(validatedCatalog, null, 2)}\n`,
  );

  yield* E.logInfo("Generated Fellowship unit catalog.", {
    inputFilePath,
    outputFilePath: OUTPUT_FILE_PATH,
    unitCount: validatedCatalog.length,
  });
});
