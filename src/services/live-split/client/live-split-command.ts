export const LiveSplitSendCommand = {
  pause: "pause",
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
  getLiveSplitVersion: "getlivesplitversion",
  getServerType: "getservertype",
  getSplitIndex: "getsplitindex",
  getSplitsPath: "getsplitspath",
  getTimerPhase: "getcurrenttimerphase",
  ping: "ping",
  saveSplitsAs: "savesplitsas",
  switchSplits: "switchsplits",
} as const;

export type LiveSplitRequestCommand =
  (typeof LiveSplitRequestCommand)[keyof typeof LiveSplitRequestCommand];

export const LIVE_SPLIT_EOL = "\r\n";

export function appendEOL(command: string): string {
  return `${command}${LIVE_SPLIT_EOL}`;
}
