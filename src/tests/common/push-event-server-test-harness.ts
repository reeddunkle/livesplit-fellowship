import * as E from "effect/Effect";
import * as Ref from "effect/Ref";

import { type PushEventServerService } from "@/services/api/push-event-server-service.ts";

export function makePushEventServerTestHarness() {
  return E.gen(function* () {
    const clientCount = yield* Ref.make(0);
    const messages = yield* Ref.make<ReadonlyArray<string>>([]);

    const pushEventServer: PushEventServerService = {
      clientCount: Ref.get(clientCount),

      publish: (message) => {
        return Ref.update(messages, (messages) => {
          return [...messages, message];
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
