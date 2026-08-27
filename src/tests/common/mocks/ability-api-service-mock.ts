import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import {
  AbilityApiService,
  type AbilityApiServiceShape,
} from "@/services/api/ability/ability-api-service.ts";

export type MakeAbilityApiServiceMockOptions = Partial<AbilityApiServiceShape>;

export function makeAbilityApiServiceMock({
  getAll = () => {
    return E.succeed([]);
  },
  getById = () => {
    return E.succeed(Option.none());
  },
}: MakeAbilityApiServiceMockOptions = {}) {
  return Layer.succeed(AbilityApiService, {
    getAll,
    getById,
  } satisfies AbilityApiServiceShape);
}

export const AbilityApiServiceMock = makeAbilityApiServiceMock();
