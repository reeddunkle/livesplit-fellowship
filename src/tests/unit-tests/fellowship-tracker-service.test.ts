import * as Deferred from "effect/Deferred";
import * as E from "effect/Effect";
import * as Result from "effect/Result";
import * as Stream from "effect/Stream";
import { describe, expect, test } from "vitest";

import {
  FellowshipTracker,
  FellowshipTrackerAlreadyRunningError,
} from "@/application/tracking/fellowship-tracker-service.ts";
import { makeFellowshipTrackerTestHarness } from "@/tests/common/harnesses/fellowship-tracker-test-harness.ts";

describe("FellowshipTracker", () => {
  test("starts idle", async () => {
    const status = await E.runPromise(
      E.scoped(
        E.gen(function* () {
          const harness = yield* makeFellowshipTrackerTestHarness();

          return yield* E.gen(function* () {
            const tracker = yield* FellowshipTracker;

            return yield* tracker.status;
          }).pipe(E.provide(harness.layer));
        }),
      ),
    );

    expect(status).toEqual({
      _tag: "Idle",
    });
  });

  test("changes status to tracking after starting", async () => {
    const result = await E.runPromise(
      E.scoped(
        E.gen(function* () {
          const harness = yield* makeFellowshipTrackerTestHarness();

          const status = yield* E.gen(function* () {
            const tracker = yield* FellowshipTracker;

            yield* tracker.start({
              configurationId: harness.configurationId,
            });

            yield* Deferred.await(harness.trackingStarted);

            return yield* tracker.status;
          }).pipe(E.provide(harness.layer));

          return {
            configurationId: harness.configurationId,
            dungeonId: harness.configuration.dungeonId,
            status,
          };
        }),
      ),
    );

    expect(result.status).toEqual({
      _tag: "Tracking",
      configurationId: result.configurationId,
      dungeonId: result.dungeonId,
    });
  });

  test("fails when starting while already tracking", async () => {
    const result = await E.runPromise(
      E.scoped(
        E.gen(function* () {
          const harness = yield* makeFellowshipTrackerTestHarness();

          return yield* E.gen(function* () {
            const tracker = yield* FellowshipTracker;

            yield* tracker.start({
              configurationId: harness.configurationId,
            });

            yield* Deferred.await(harness.trackingStarted);

            return yield* E.result(
              tracker.start({
                configurationId: harness.configurationId,
              }),
            );
          }).pipe(E.provide(harness.layer));
        }),
      ),
    );

    expect(Result.isFailure(result)).toBe(true);

    if (Result.isFailure(result)) {
      expect(result.failure).toBeInstanceOf(
        FellowshipTrackerAlreadyRunningError,
      );
    }
  });

  test("interrupts the tracking fiber when stopped", async () => {
    await E.runPromise(
      E.scoped(
        E.gen(function* () {
          const harness = yield* makeFellowshipTrackerTestHarness();

          yield* E.gen(function* () {
            const tracker = yield* FellowshipTracker;

            yield* tracker.start({
              configurationId: harness.configurationId,
            });

            yield* Deferred.await(harness.trackingStarted);

            yield* tracker.stop();

            yield* Deferred.await(harness.trackingInterrupted);
          }).pipe(E.provide(harness.layer));
        }),
      ),
    );
  });

  test("returns to idle after stopping", async () => {
    const status = await E.runPromise(
      E.scoped(
        E.gen(function* () {
          const harness = yield* makeFellowshipTrackerTestHarness();

          return yield* E.gen(function* () {
            const tracker = yield* FellowshipTracker;

            yield* tracker.start({
              configurationId: harness.configurationId,
            });

            yield* Deferred.await(harness.trackingStarted);

            yield* tracker.stop();

            return yield* tracker.status;
          }).pipe(E.provide(harness.layer));
        }),
      ),
    );

    expect(status).toEqual({
      _tag: "Idle",
    });
  });

  test("does nothing when stopped while idle", async () => {
    const status = await E.runPromise(
      E.scoped(
        E.gen(function* () {
          const harness = yield* makeFellowshipTrackerTestHarness();

          return yield* E.gen(function* () {
            const tracker = yield* FellowshipTracker;

            yield* tracker.stop();

            return yield* tracker.status;
          }).pipe(E.provide(harness.layer));
        }),
      ),
    );

    expect(status).toEqual({
      _tag: "Idle",
    });
  });

  test("returns to idle when the tracking effect completes", async () => {
    const status = await E.runPromise(
      E.scoped(
        E.gen(function* () {
          const harness = yield* makeFellowshipTrackerTestHarness({
            liveEvents: Stream.empty,
          });

          return yield* E.gen(function* () {
            const tracker = yield* FellowshipTracker;

            yield* tracker.start({
              configurationId: harness.configurationId,
            });

            yield* E.yieldNow;

            return yield* tracker.status;
          }).pipe(E.provide(harness.layer));
        }),
      ),
    );

    expect(status).toEqual({
      _tag: "Idle",
    });
  });

  test("allows only one concurrent start", async () => {
    const results = await E.runPromise(
      E.scoped(
        E.gen(function* () {
          const harness = yield* makeFellowshipTrackerTestHarness();

          return yield* E.gen(function* () {
            const tracker = yield* FellowshipTracker;

            return yield* E.all(
              [
                E.result(
                  tracker.start({
                    configurationId: harness.configurationId,
                  }),
                ),
                E.result(
                  tracker.start({
                    configurationId: harness.configurationId,
                  }),
                ),
              ],
              {
                concurrency: "unbounded",
              },
            );
          }).pipe(E.provide(harness.layer));
        }),
      ),
    );

    const successes = results.filter(Result.isSuccess);
    const failures = results.filter(Result.isFailure);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    const [failure] = failures;

    if (failure !== undefined) {
      expect(failure.failure).toBeInstanceOf(
        FellowshipTrackerAlreadyRunningError,
      );
    }
  });

  test("interrupts the tracking fiber when the service scope closes", async () => {
    const trackingInterrupted = await E.runPromise(
      E.scoped(
        E.gen(function* () {
          const harness = yield* makeFellowshipTrackerTestHarness();

          yield* E.gen(function* () {
            const tracker = yield* FellowshipTracker;

            yield* tracker.start({
              configurationId: harness.configurationId,
            });

            yield* Deferred.await(harness.trackingStarted);
          }).pipe(E.provide(harness.layer));

          return harness.trackingInterrupted;
        }),
      ),
    );

    await E.runPromise(Deferred.await(trackingInterrupted));
  });
});
