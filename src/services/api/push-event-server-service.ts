import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import type * as Scope from "effect/Scope";
import type * as Socket from "effect/unstable/socket/Socket";

type PushEventWriter = (message: string) => E.Effect<void, Socket.SocketError>;

export interface PushEventServerService {
  readonly clientCount: E.Effect<number>;

  readonly publish: (message: string) => E.Effect<void, Socket.SocketError>;

  readonly registerClient: (
    writer: PushEventWriter,
  ) => E.Effect<void, never, Scope.Scope>;
}

export class PushEventServer extends Context.Service<
  PushEventServer,
  PushEventServerService
>()("app/PushEventServer") {}

const makePushEventServerLive = E.gen(function* () {
  const clients = yield* Ref.make(HashSet.empty<PushEventWriter>());

  const clientCount = Ref.get(clients).pipe(
    E.map((clients) => {
      return HashSet.size(clients);
    }),
  );

  const registerClient = (
    writer: PushEventWriter,
  ): E.Effect<void, never, Scope.Scope> => {
    return E.acquireRelease(
      Ref.update(clients, (clients) => {
        return HashSet.add(clients, writer);
      }),
      () => {
        return Ref.update(clients, (clients) => {
          return HashSet.remove(clients, writer);
        });
      },
    );
  };

  const publish = (message: string): E.Effect<void, Socket.SocketError> => {
    return E.gen(function* () {
      const connectedClients = yield* Ref.get(clients);

      yield* E.forEach(
        connectedClients,
        (writer) => {
          return writer(message);
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
  } satisfies PushEventServerService;
});

export const PushEventServerLive = Layer.effect(
  PushEventServer,
  makePushEventServerLive,
);
