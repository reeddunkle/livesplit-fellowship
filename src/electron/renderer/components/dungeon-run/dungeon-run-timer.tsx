import { useEffect, useState } from "react";

import { formatDuration } from "@/electron/renderer/components/dungeon-run/dungeon-run-time.ts";

type DungeonRunTimerProps = {
  readonly initialElapsedMilliseconds: number | undefined;
  readonly isRunning: boolean;
};

function useElapsedTimer({
  initialElapsedMilliseconds,
  isRunning,
}: DungeonRunTimerProps): number | undefined {
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(
    initialElapsedMilliseconds,
  );

  useEffect(() => {
    if (initialElapsedMilliseconds === undefined) {
      setElapsedMilliseconds(undefined);
      return;
    }

    setElapsedMilliseconds(initialElapsedMilliseconds);

    if (!isRunning) {
      return;
    }

    const startedAt = performance.now();

    const update = () => {
      const elapsedSinceStart = performance.now() - startedAt;

      setElapsedMilliseconds(initialElapsedMilliseconds + elapsedSinceStart);

      animationFrameId = requestAnimationFrame(update);
    };

    let animationFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [initialElapsedMilliseconds, isRunning]);

  return elapsedMilliseconds;
}

export function DungeonRunTimer({
  initialElapsedMilliseconds,
  isRunning,
}: DungeonRunTimerProps) {
  const elapsedMilliseconds = useElapsedTimer({
    initialElapsedMilliseconds,
    isRunning,
  });

  return (
    <div className="text-center font-mono text-5xl font-semibold tabular-nums">
      {formatDuration(elapsedMilliseconds)}
    </div>
  );
}
