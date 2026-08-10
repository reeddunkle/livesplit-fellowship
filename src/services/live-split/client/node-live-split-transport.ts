import * as NodeSocket from "@effect/platform-node/NodeSocket";
import * as Config from "effect/Config";
import * as E from "effect/Effect";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import type * as Socket from "effect/unstable/socket/Socket";

export interface LiveSplitTransport {
  readonly chunks: Stream.Stream<string, Socket.SocketError>;

  readonly write: (data: string) => E.Effect<void, Socket.SocketError>;
}

const SOCKET_OPEN_TIMEOUT = "5 seconds";

export const makeNodeLiveSplitTransport = E.gen(function* () {
  const host = yield* Config.string("LIVE_SPLITS_HOST");
  const port = yield* Config.port("LIVE_SPLITS_PORT");

  const socket = yield* NodeSocket.makeNet({
    host,
    openTimeout: SOCKET_OPEN_TIMEOUT,
    port,
  });

  const socketWriter = yield* socket.writer;

  const chunks = Stream.callback<string, Socket.SocketError>((queue) => {
    return socket.runString(
      (socketChunk) => {
        return Queue.offer(queue, socketChunk).pipe(E.asVoid);
      },
      {
        onOpen: E.logInfo("Connected to LiveSplit.", {
          host,
          port,
        }),
      },
    );
  });

  return {
    chunks,

    write: (data) => {
      return socketWriter(data);
    },
  } satisfies LiveSplitTransport;
});
