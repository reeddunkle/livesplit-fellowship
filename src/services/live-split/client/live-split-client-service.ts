import * as NodeSocket from "@effect/platform-node/NodeSocket";
import type * as Cause from "effect/Cause";
import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Ref from "effect/Ref";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";
import type * as Socket from "effect/unstable/socket/Socket";

import {
  InvalidLiveSplitResponseError,
  LiveSplitClientUnavailableError,
} from "@/errors/live-split-client-error.ts";

import {
  LiveSplitRequestCommand,
  LiveSplitSendCommand,
} from "./live-split-command.ts";

const COMMAND_EOL = "\r\n";
const RESPONSE_EOL = "\n";
const RESPONSE_TIMEOUT = "5 seconds";
const SOCKET_OPEN_TIMEOUT = "5 seconds";

type LiveSplitRequestError =
  | Cause.TimeoutError
  | LiveSplitClientUnavailableError
  | Socket.SocketError;

export interface LiveSplitClientService {
  readonly getCurrentTime: () => E.Effect<string, LiveSplitRequestError>;

  readonly getSplitIndex: () => E.Effect<
    number,
    InvalidLiveSplitResponseError | LiveSplitRequestError
  >;

  readonly getTimerPhase: () => E.Effect<string, LiveSplitRequestError>;

  readonly pause: () => E.Effect<void, Socket.SocketError>;

  readonly reset: () => E.Effect<void, Socket.SocketError>;

  readonly setComparison: (
    comparisonName: string,
  ) => E.Effect<void, Socket.SocketError>;

  readonly setCurrentSplitName: (
    splitName: string,
  ) => E.Effect<void, Socket.SocketError>;

  readonly split: () => E.Effect<void, Socket.SocketError>;

  readonly startTimer: () => E.Effect<void, Socket.SocketError>;
}

export class LiveSplitClient extends Context.Service<
  LiveSplitClient,
  LiveSplitClientService
>()("app/LiveSplitClient") {}

function appendCommandArgument({
  argument,
  command,
}: {
  readonly argument: string;
  readonly command: string;
}): string {
  /*
   * LiveSplit Server uses newlines to delimit commands, so arguments must not
   * be allowed to inject an additional command.
   */
  const sanitizedArgument = argument.replaceAll(/[\r\n]/g, " ");

  return `${command} ${sanitizedArgument}`;
}

const makeLiveSplitClient = E.gen(function* () {
  const host = yield* Config.string("LIVE_SPLITS_HOST");
  const port = yield* Config.port("LIVE_SPLITS_PORT");

  const socket = yield* NodeSocket.makeNet({
    host,
    openTimeout: SOCKET_OPEN_TIMEOUT,
    port,
  });

  const socketChunkQueue = yield* Queue.unbounded<string>();
  const responseQueue = yield* Queue.unbounded<string>();
  const requestSemaphore = yield* Semaphore.make(1);

  /*
   * If a request times out, its response could arrive later and otherwise be
   * mistaken for the response to the next request. Marking the response
   * channel invalid prevents further requests from using a desynchronized
   * connection.
   */
  const isResponseChannelValid = yield* Ref.make(true);

  const responseStream = Stream.fromQueue(socketChunkQueue).pipe(
    Stream.mapAccumEffect(
      () => "",
      (responseBuffer, socketChunk) => {
        const responseParts = `${responseBuffer}${socketChunk}`.split(
          RESPONSE_EOL,
        );

        const remainingBuffer = responseParts.pop() ?? "";

        const completeResponses = responseParts.map((response) => {
          return response.replace(/\r$/, "");
        });

        return E.succeed([remainingBuffer, completeResponses] as const);
      },
    ),
  );

  yield* responseStream.pipe(
    Stream.runForEach((response) => {
      return Queue.offer(responseQueue, response).pipe(E.asVoid);
    }),
    E.forkScoped,
  );

  yield* socket
    .runString(
      (socketChunk) => {
        return Queue.offer(socketChunkQueue, socketChunk).pipe(E.asVoid);
      },
      {
        onOpen: E.logInfo("Connected to LiveSplit.", {
          host,
          port,
        }),
      },
    )
    .pipe(E.forkScoped);

  const write = yield* socket.writer;

  const send = (command: string): E.Effect<void, Socket.SocketError> => {
    return write(`${command}${COMMAND_EOL}`);
  };

  const request = (
    command: LiveSplitRequestCommand,
  ): E.Effect<string, LiveSplitRequestError> => {
    return requestSemaphore.withPermit(
      E.gen(function* () {
        const responseChannelIsValid = yield* Ref.get(isResponseChannelValid);

        if (!responseChannelIsValid) {
          return yield* new LiveSplitClientUnavailableError({
            reason:
              "a previous request timed out and the response stream " +
              "may no longer be synchronized",
          });
        }

        yield* send(command);

        return yield* Queue.take(responseQueue).pipe(
          E.timeout(RESPONSE_TIMEOUT),
          E.tapError(() => {
            return Ref.set(isResponseChannelValid, false);
          }),
        );
      }),
    );
  };

  const parseSplitIndex = (
    response: string,
  ): E.Effect<number, InvalidLiveSplitResponseError> => {
    const splitIndex = Number.parseInt(response, 10);

    if (Number.isNaN(splitIndex)) {
      return E.fail(
        new InvalidLiveSplitResponseError({
          command: LiveSplitRequestCommand.getSplitIndex,
          response,
        }),
      );
    }

    return E.succeed(splitIndex);
  };

  return {
    getCurrentTime: () => {
      return request(LiveSplitRequestCommand.getCurrentTime);
    },

    getSplitIndex: () => {
      return request(LiveSplitRequestCommand.getSplitIndex).pipe(
        E.flatMap(parseSplitIndex),
      );
    },

    getTimerPhase: () => {
      return request(LiveSplitRequestCommand.getTimerPhase);
    },

    pause: () => {
      return send(LiveSplitSendCommand.pause);
    },

    reset: () => {
      return send(LiveSplitSendCommand.reset);
    },

    setComparison: (comparisonName) => {
      return send(
        appendCommandArgument({
          argument: comparisonName,
          command: LiveSplitSendCommand.setComparison,
        }),
      );
    },

    setCurrentSplitName: (splitName) => {
      return send(
        appendCommandArgument({
          argument: splitName,
          command: LiveSplitSendCommand.setCurrentSplitName,
        }),
      );
    },

    split: () => {
      return send(LiveSplitSendCommand.split);
    },

    startTimer: () => {
      return send(LiveSplitSendCommand.startTimer);
    },
  } satisfies LiveSplitClientService;
});

export const LiveSplitClientLive = Layer.effect(
  LiveSplitClient,
  makeLiveSplitClient,
);
