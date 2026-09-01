import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as ScopedRef from "effect/ScopedRef";
import type * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";

import { LiveSplitConnectionError } from "@/errors/live-split-client-error.ts";
import {
  type LiveSplitClientService,
  makeLiveSplitClient,
} from "@/services/live-split/core/live-split-client-service.ts";
import { makeNodeLiveSplitTransport } from "@/services/live-split/core/node-live-split-transport.ts";

export type LiveSplitConnectionStatus =
  | {
      readonly _tag: "Disconnected";
    }
  | {
      readonly _tag: "Connected";
    };

export interface LiveSplitConnectionManagerService {
  readonly client: E.Effect<Option.Option<LiveSplitClientService>>;

  readonly connect: () => E.Effect<void, LiveSplitConnectionError>;

  readonly disconnect: () => E.Effect<void>;

  readonly status: E.Effect<LiveSplitConnectionStatus>;

  readonly statusChanges: Stream.Stream<LiveSplitConnectionStatus>;
}

export class LiveSplitConnectionManager extends Context.Service<
  LiveSplitConnectionManager,
  LiveSplitConnectionManagerService
>()("app/LiveSplitConnectionManager") {}

const DISCONNECTED_STATUS = {
  _tag: "Disconnected",
} satisfies LiveSplitConnectionStatus;

const CONNECTED_STATUS = {
  _tag: "Connected",
} satisfies LiveSplitConnectionStatus;

const make = E.gen(function* () {
  const clientRef = yield* ScopedRef.make<
    Option.Option<LiveSplitClientService>
  >(() => Option.none());

  const statusRef =
    yield* SubscriptionRef.make<LiveSplitConnectionStatus>(DISCONNECTED_STATUS);

  const client: LiveSplitConnectionManagerService["client"] =
    ScopedRef.get(clientRef);

  const status: LiveSplitConnectionManagerService["status"] =
    SubscriptionRef.get(statusRef);

  const statusChanges: LiveSplitConnectionManagerService["statusChanges"] =
    SubscriptionRef.changes(statusRef);

  const connect: LiveSplitConnectionManagerService["connect"] = () => {
    const acquireClient = E.gen(function* () {
      const host = yield* Config.string("LIVE_SPLITS_HOST");
      const port = yield* Config.port("LIVE_SPLITS_PORT");

      const transport = yield* makeNodeLiveSplitTransport({
        host,
        port,
      });

      const client = yield* makeLiveSplitClient({
        transport,
      });

      return Option.some(client);
    }).pipe(
      E.mapError((cause) => {
        return new LiveSplitConnectionError({
          cause,
        });
      }),
    );

    return E.gen(function* () {
      yield* ScopedRef.set(clientRef, acquireClient);
      yield* SubscriptionRef.set(statusRef, CONNECTED_STATUS);
    });
  };

  const disconnect: LiveSplitConnectionManagerService["disconnect"] = () => {
    return E.gen(function* () {
      yield* ScopedRef.set(clientRef, E.succeed(Option.none()));
      yield* SubscriptionRef.set(statusRef, DISCONNECTED_STATUS);
    });
  };

  return {
    client,
    connect,
    disconnect,
    status,
    statusChanges,
  } satisfies LiveSplitConnectionManagerService;
});

export const LiveSplitConnectionManagerLive = Layer.effect(
  LiveSplitConnectionManager,
  make,
);
