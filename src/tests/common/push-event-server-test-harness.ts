import * as E from "effect/Effect";
import * as Ref from "effect/Ref";

import { type PushEventServerService } from "@/services/api/push-event-server-service.ts";

export function makePushEventServerTestHarness() {
  return E.gen(function* () {
    const messages = yield* Ref.make<ReadonlyArray<string>>([]);

    const pushEventServer: PushEventServerService = {
      publish: (message) => {
        return Ref.update(messages, (messages) => {
          return [...messages, message];
        });
      },

      registerClient: () => {
        return E.void;
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
