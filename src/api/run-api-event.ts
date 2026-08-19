export const RUN_API_EVENT = {
  MILESTONE_COMPLETED: "MILESTONE_COMPLETED",
  RUN_EXITED: "RUN_EXITED",
  RUN_STARTED: "RUN_STARTED",
} as const;

export type RunStartedApiEvent = {
  readonly timestampMilliseconds: number;
  readonly type: typeof RUN_API_EVENT.RUN_STARTED;
};

export type RunExitedApiEvent = {
  readonly timestampMilliseconds: number;
  readonly type: typeof RUN_API_EVENT.RUN_EXITED;
};

export type MilestoneCompletedApiEvent = {
  readonly milestone: {
    readonly elapsedMilliseconds: number;
    readonly label: string;
    readonly milestoneId: string;
    readonly timestampMilliseconds: number;
  };
  readonly type: typeof RUN_API_EVENT.MILESTONE_COMPLETED;
};

export type RunApiEvent =
  | RunStartedApiEvent
  | RunExitedApiEvent
  | MilestoneCompletedApiEvent;

export type RunApiMessage = {
  readonly event: RunApiEvent;
  readonly version: 1;
};
