import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as E from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Ref from "effect/Ref";
import * as Result from "effect/Result";
import * as Stream from "effect/Stream";
import type * as Socket from "effect/unstable/socket/Socket";

import {
  InvalidLiveSplitResponseError,
  LiveSplitClientUnavailableError,
} from "@/errors/live-split-client-error.ts";

import {
  appendCommandArgument,
  appendEOL,
  LIVE_SPLIT_EOL,
  LiveSplitRequestCommand,
  LiveSplitSendCommand,
} from "./live-split-command.ts";
import {
  type LiveSplitTransport,
  makeNodeLiveSplitTransport,
} from "./node-live-split-transport.ts";

const RESPONSE_TIMEOUT = "5 seconds";

type LiveSplitRequestError =
  | Cause.TimeoutError
  | LiveSplitClientUnavailableError
  | Socket.SocketError;

type PendingLiveSplitRequest = {
  readonly command: string;
  readonly responseDeferred: Deferred.Deferred<string, LiveSplitRequestError>;
};

type LiveSplitResponseQueueItem = Result.Result<
  string,
  Cause.Cause<LiveSplitRequestError>
>;

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

  readonly switchSplits: (
    filePath: string,
  ) => E.Effect<void, InvalidLiveSplitResponseError | LiveSplitRequestError>;
}

export class LiveSplitClient extends Context.Service<
  LiveSplitClient,
  LiveSplitClientService
>()("app/LiveSplitClient") {}

export function makeLiveSplitClient({
  transport,
}: {
  readonly transport: LiveSplitTransport;
}) {
  return E.gen(function* () {
    const responseQueue = yield* Queue.unbounded<LiveSplitResponseQueueItem>();

    const requestQueue = yield* Queue.unbounded<PendingLiveSplitRequest>();

    /*
     * Once the response channel becomes unusable, retain the failure so
     * future requests fail immediately rather than waiting for a timeout.
     */
    const responseChannelFailure = yield* Ref.make<
      Cause.Cause<LiveSplitRequestError> | undefined
    >(undefined);

    /*
     * TCP gives us arbitrary chunks rather than guaranteed complete responses.
     * This stream accumulates chunks until one or more newline-delimited
     * LiveSplit responses can be emitted.
     */
    const responseStream = transport.chunks.pipe(
      Stream.mapAccumEffect(
        () => "",
        (responseBuffer, socketChunk) => {
          const responseParts = `${responseBuffer}${socketChunk}`.split(
            LIVE_SPLIT_EOL,
          );

          const remainingBuffer = responseParts.pop() ?? "";

          return E.succeed([remainingBuffer, responseParts] as const);
        },
      ),
    );

    /*
     * Continuously process the incoming response stream.
     *
     * A transport failure is placed onto the response queue so a currently
     * waiting request is notified immediately. The failure is also retained
     * so future requests fail immediately.
     */
    yield* E.gen(function* () {
      const exit = yield* E.exit(
        responseStream.pipe(
          Stream.runForEach((response) => {
            return Queue.offer(responseQueue, Result.succeed(response));
          }),
        ),
      );

      let failureCause: Cause.Cause<LiveSplitRequestError>;

      if (Exit.isFailure(exit)) {
        failureCause = exit.cause;
      } else {
        failureCause = Cause.fail(
          new LiveSplitClientUnavailableError({
            reason: "the LiveSplit response stream ended",
          }),
        );
      }

      yield* Ref.set(responseChannelFailure, failureCause);

      yield* Queue.offer(responseQueue, Result.fail(failureCause));
    }).pipe(E.forkScoped);

    const send = (command: string): E.Effect<void, Socket.SocketError> => {
      return transport.write(appendEOL(command));
    };

    /*
     * Process response-producing commands sequentially.
     *
     * LiveSplit responses do not contain request IDs, so only one request may
     * be awaiting a response at a time. Each queued request carries its own
     * Deferred, allowing the worker to deliver the response directly back to
     * the caller that submitted it.
     */
    yield* Stream.fromQueue(requestQueue).pipe(
      Stream.runForEach(({ command, responseDeferred }) => {
        return E.gen(function* () {
          const requestEffect = E.gen(function* () {
            const existingFailure = yield* Ref.get(responseChannelFailure);

            if (existingFailure !== undefined) {
              return yield* E.failCause(existingFailure);
            }

            yield* send(command).pipe(
              E.tapCause((cause) => {
                return Ref.set(responseChannelFailure, cause);
              }),
            );

            const responseResult = yield* Queue.take(responseQueue).pipe(
              E.timeout(RESPONSE_TIMEOUT),
              E.tapError(() => {
                const failureCause = Cause.fail(
                  new LiveSplitClientUnavailableError({
                    reason:
                      "a previous request timed out and the response " +
                      "stream may no longer be synchronized",
                  }),
                );

                return Ref.set(responseChannelFailure, failureCause);
              }),
            );

            return yield* Result.match(responseResult, {
              onFailure: (cause) => {
                return E.failCause(cause);
              },
              onSuccess: (response) => {
                return E.succeed(response);
              },
            });
          });

          const requestExit = yield* E.exit(requestEffect);

          yield* Exit.match(requestExit, {
            onFailure: (cause) => {
              return Deferred.failCause(responseDeferred, cause);
            },
            onSuccess: (response) => {
              return Deferred.succeed(responseDeferred, response);
            },
          });
        });
      }),
      E.forkScoped,
    );

    const request = (
      command: string,
    ): E.Effect<string, LiveSplitRequestError> => {
      return E.gen(function* () {
        const responseDeferred = yield* Deferred.make<
          string,
          LiveSplitRequestError
        >();

        yield* Queue.offer(requestQueue, {
          command,
          responseDeferred,
        });

        return yield* Deferred.await(responseDeferred);
      });
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

    const requireSuccessfulBooleanResponse = ({
      command,
      response,
    }: {
      readonly command: string;
      readonly response: string;
    }): E.Effect<void, InvalidLiveSplitResponseError> => {
      if (response.trim().toLowerCase() === "true") {
        return E.void;
      }

      return E.fail(
        new InvalidLiveSplitResponseError({
          command,
          response,
        }),
      );
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

      switchSplits: (filePath) => {
        const command = appendCommandArgument({
          argument: filePath,
          command: LiveSplitRequestCommand.switchSplits,
        });

        return request(command).pipe(
          E.flatMap((response) => {
            return requireSuccessfulBooleanResponse({
              command: LiveSplitRequestCommand.switchSplits,
              response,
            });
          }),
        );
      },
    } satisfies LiveSplitClientService;
  });
}

const makeLiveSplitClientLive = E.gen(function* () {
  const transport = yield* makeNodeLiveSplitTransport;

  return yield* makeLiveSplitClient({
    transport,
  });
});

export const LiveSplitClientLive = Layer.effect(
  LiveSplitClient,
  makeLiveSplitClientLive,
);
