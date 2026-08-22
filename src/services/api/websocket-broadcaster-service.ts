import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import type * as Scope from "effect/Scope";
import type * as Socket from "effect/unstable/socket/Socket";

export type WebSocketWriter = (
  message: string,
) => E.Effect<void, Socket.SocketError>;

export interface WebSocketBroadcasterService {
  readonly clientCount: E.Effect<number>;

  readonly publish: (message: string) => E.Effect<void>;

  readonly registerClient: (
    writer: WebSocketWriter,
  ) => E.Effect<void, never, Scope.Scope>;

  readonly sendLatestToClient: (writer: WebSocketWriter) => E.Effect<void>;
}

export class WebSocketBroadcaster extends Context.Service<
  WebSocketBroadcaster,
  WebSocketBroadcasterService
>()("app/WebSocketBroadcaster") {}

const make = E.gen(function* () {
  const clients = yield* Ref.make(HashSet.empty<WebSocketWriter>());
  const latestMessage = yield* Ref.make<string | undefined>(undefined);

  const clientCount = Ref.get(clients).pipe(
    E.map((clients) => {
      return HashSet.size(clients);
    }),
  );

  const removeClient = (writer: WebSocketWriter): E.Effect<void> => {
    return Ref.update(clients, (clients) => {
      return HashSet.remove(clients, writer);
    });
  };

  const writeToClient = ({
    message,
    writer,
  }: {
    readonly message: string;
    readonly writer: WebSocketWriter;
  }): E.Effect<void> => {
    return writer(message).pipe(
      E.catch((error) =>
        E.gen(function* () {
          yield* removeClient(writer);

          yield* E.logWarning("WebSocket client write failed.", {
            error,
          });
        }),
      ),
    );
  };

  const registerClient = (
    writer: WebSocketWriter,
  ): E.Effect<void, never, Scope.Scope> => {
    return E.acquireRelease(
      Ref.update(clients, (clients) => {
        return HashSet.add(clients, writer);
      }),
      () => {
        return removeClient(writer);
      },
    );
  };

  const sendLatestToClient = (writer: WebSocketWriter): E.Effect<void> => {
    return E.gen(function* () {
      const message = yield* Ref.get(latestMessage);

      if (message === undefined) {
        return;
      }

      yield* writeToClient({
        message,
        writer,
      });
    });
  };

  const publish = (message: string): E.Effect<void> => {
    return E.gen(function* () {
      yield* Ref.set(latestMessage, message);

      const connectedClients = yield* Ref.get(clients);

      yield* E.forEach(
        connectedClients,
        (writer) => {
          return writeToClient({
            message,
            writer,
          });
        },
        {
          concurrency: "unbounded",
          discard: true,
        },
      );
    });
  };

  return {
    clientCount,
    publish,
    registerClient,
    sendLatestToClient,
  } satisfies WebSocketBroadcasterService;
});

export const WebSocketBroadcasterLive = Layer.effect(
  WebSocketBroadcaster,
  make,
);
