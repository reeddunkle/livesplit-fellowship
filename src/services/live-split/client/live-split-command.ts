export const LiveSplitSendCommand = {
  reset: "reset",
  setComparison: "setcomparison",
  setCurrentSplitName: "setcurrentsplitname",
  split: "split",
  startTimer: "starttimer",
} as const;

export type LiveSplitSendCommand =
  (typeof LiveSplitSendCommand)[keyof typeof LiveSplitSendCommand];

export const LiveSplitRequestCommand = {
  getCurrentTime: "getcurrenttime",
  getSplitIndex: "getsplitindex",
  getTimerPhase: "getcurrenttimerphase",
  ping: "ping",
} as const;

export type LiveSplitRequestCommand =
  (typeof LiveSplitRequestCommand)[keyof typeof LiveSplitRequestCommand];
