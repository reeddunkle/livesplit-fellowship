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

type LiveSplitCommand = LiveSplitSendCommand | LiveSplitRequestCommand;

export const LIVE_SPLIT_EOL = "\r\n";

export function appendEOL(value: string): string {
  return `${value}${LIVE_SPLIT_EOL}`;
}

export function appendCommandArgument({
  argument,
  command,
}: {
  readonly argument: string;
  readonly command: LiveSplitCommand;
}): string {
  // Ensure command arguments cannot inject additional protocol lines
  const sanitizedArgument = argument.replaceAll(/[\r\n]/g, " ");

  return `${command} ${sanitizedArgument}`;
}
