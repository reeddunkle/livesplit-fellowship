import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as ScopedRef from "effect/ScopedRef";

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
}

export class LiveSplitConnectionManager extends Context.Service<
  LiveSplitConnectionManager,
  LiveSplitConnectionManagerService
>()("app/LiveSplitConnectionManager") {}

const make = E.gen(function* () {
  const clientRef = yield* ScopedRef.make<
    Option.Option<LiveSplitClientService>
  >(() => Option.none());

  const client: LiveSplitConnectionManagerService["client"] =
    ScopedRef.get(clientRef);

  const status: LiveSplitConnectionManagerService["status"] = client.pipe(
    E.map((client) => {
      return Option.match(client, {
        onNone: (): LiveSplitConnectionStatus => {
          return {
            _tag: "Disconnected",
          };
        },
        onSome: (): LiveSplitConnectionStatus => {
          return {
            _tag: "Connected",
          };
        },
      });
    }),
  );

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

    return ScopedRef.set(clientRef, acquireClient);
  };

  const disconnect: LiveSplitConnectionManagerService["disconnect"] = () => {
    return ScopedRef.set(clientRef, E.succeed(Option.none()));
  };

  return {
    client,
    connect,
    disconnect,
    status,
  } satisfies LiveSplitConnectionManagerService;
});

export const LiveSplitConnectionManagerLive = Layer.effect(
  LiveSplitConnectionManager,
  make,
);
