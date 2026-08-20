import * as E from "effect/Effect";
import * as Ref from "effect/Ref";

import {
  type PushEventServerService,
  type PushEventWriter,
} from "@/services/api/push-event-server-service.ts";

export function makePushEventServerTestHarness() {
  return E.gen(function* () {
    const clientCount = yield* Ref.make(0);
    const latestMessage = yield* Ref.make<string | undefined>(undefined);
    const messages = yield* Ref.make<ReadonlyArray<string>>([]);

    const pushEventServer: PushEventServerService = {
      clientCount: Ref.get(clientCount),

      publish: (message) => {
        return E.gen(function* () {
          yield* Ref.set(latestMessage, message);

          yield* Ref.update(messages, (messages) => {
            return [...messages, message];
          });
        });
      },

      registerClient: () => {
        return E.acquireRelease(
          Ref.update(clientCount, (count) => {
            return count + 1;
          }),
          () => {
            return Ref.update(clientCount, (count) => {
              return count - 1;
            });
          },
        );
      },

      sendLatestToClient: (writer: PushEventWriter) => {
        return E.gen(function* () {
          const message = yield* Ref.get(latestMessage);

          if (message === undefined) {
            return;
          }

          yield* writer(message);
        });
      },
    };

    const getMessages = () => {
      return Ref.get(messages);
    };

    const getParsedMessages = () => {
      return Ref.get(messages).pipe(
        E.map((messages) => {
          return messages.map((message) => {
            return JSON.parse(message) as unknown;
          });
        }),
      );
    };

    return {
      getMessages,
      getParsedMessages,
      pushEventServer,
    };
  });
}
