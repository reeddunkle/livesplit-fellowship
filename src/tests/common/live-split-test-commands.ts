import {
  appendEOL,
  LiveSplitSendCommand,
} from "@/services/live-split/client/live-split-command.ts";

export const dungeonStartCommands = [
  appendEOL(LiveSplitSendCommand.reset),
  appendEOL(LiveSplitSendCommand.startTimer),
];
