import * as A from "effect/Array";
import { pipe } from "effect/Function";
import * as Order from "effect/Order";

import { type DungeonRunObservationHistory } from "@/db/daos/dungeon-run-observation/dungeon-run-observation-dao.ts";
import {
  type DungeonRunApiHistory,
  type DungeonRunApiObservationStatistics,
} from "@/services/api/dungeon-run/dungeon-run-api-schema.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id-schema.ts";

const DungeonRunApiObservationStatisticsOrder = Order.mapInput(
  Order.Tuple([Order.String, Order.String, Order.Number]),
  (statistics: DungeonRunApiObservationStatistics) => {
    return [
      statistics.type,
      statistics.targetId,
      statistics.occurrence,
    ] as const;
  },
);

type CreateDungeonRunApiResponseOptions = {
  readonly configurationId: ConfigurationId;
  readonly observations: ReadonlyArray<DungeonRunObservationHistory>;
};

function getObservationKey(observation: DungeonRunObservationHistory): string {
  return [observation.type, observation.targetId, observation.occurrence].join(
    ":",
  );
}

function getMedian(values: ReadonlyArray<number>): number {
  const sortedValues = A.sort(values, Order.Number);

  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex] ?? 0;
  }

  const lower = sortedValues[middleIndex - 1] ?? 0;
  const upper = sortedValues[middleIndex] ?? 0;

  return (lower + upper) / 2;
}

export function createDungeonRunApiResponse({
  configurationId,
  observations,
}: CreateDungeonRunApiResponseOptions): DungeonRunApiHistory {
  const observationsByKey = observations.reduce((grouped, observation) => {
    const key = getObservationKey(observation);
    const existing = grouped.get(key);

    if (existing === undefined) {
      grouped.set(key, [observation]);

      return grouped;
    }

    existing.push(observation);

    return grouped;
  }, new Map<string, Array<DungeonRunObservationHistory>>());

  const observationStatistics = pipe(
    Array.from(observationsByKey.values()),
    A.map((groupedObservations) => {
      const first = groupedObservations[0];

      if (first === undefined) {
        return undefined;
      }

      const elapsedMilliseconds = A.map(groupedObservations, (observation) => {
        return observation.elapsedMilliseconds;
      });

      const totalElapsedMilliseconds = elapsedMilliseconds.reduce(
        (total, elapsed) => {
          return total + elapsed;
        },
        0,
      );

      return {
        averageElapsedMilliseconds:
          totalElapsedMilliseconds / elapsedMilliseconds.length,
        bestElapsedMilliseconds: Math.min(...elapsedMilliseconds),
        medianElapsedMilliseconds: getMedian(elapsedMilliseconds),
        occurrence: first.occurrence,
        sampleCount: elapsedMilliseconds.length,
        targetId: first.targetId,
        type: first.type,
      } satisfies DungeonRunApiObservationStatistics;
    }),
    A.filter((statistics): statistics is DungeonRunApiObservationStatistics => {
      return statistics !== undefined;
    }),
    A.sort(DungeonRunApiObservationStatisticsOrder),
  );

  return {
    configurationId,
    observations: observationStatistics,
  };
}
