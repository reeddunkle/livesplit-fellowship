import { type UnitModel } from "@/db/models/unit-model.ts";
import { type UnitApiUnit } from "@/services/api/unit/unit-api-schema.ts";

export function createUnitApiResponse(unit: UnitModel): UnitApiUnit {
  return {
    dungeonIds: unit.dungeonIds,
    id: unit.id,
    name: unit.name,
  };
}
