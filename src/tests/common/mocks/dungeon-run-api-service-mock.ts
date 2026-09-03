import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import {
  DungeonRunApiService,
  type DungeonRunApiServiceShape,
} from "@/services/api/dungeon-run/dungeon-run-api-service.ts";

export type MakeDungeonRunApiServiceMockOptions =
  Partial<DungeonRunApiServiceShape>;

function makeDungeonRunApiServiceMock({
  getHistory = () => {
    return E.succeed(Option.none());
  },
}: MakeDungeonRunApiServiceMockOptions = {}) {
  return Layer.succeed(DungeonRunApiService, {
    getHistory,
  } satisfies DungeonRunApiServiceShape);
}

export const DungeonRunApiServiceMock = makeDungeonRunApiServiceMock();
