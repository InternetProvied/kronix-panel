import { Collection, REST, Routes } from "discord.js";
import { ticketCommand } from "./ticket.js";
import { totalCommand } from "./total.js";
import { banCommand } from "./ban.js";
import { kickCommand } from "./kick.js";
import { addroleCommand } from "./addrole.js";
import {
  lockchannelCommand,
  unlockchannelCommand,
} from "./lockchannel.js";
import { dmCommand } from "./dm.js";
import { locknameCommand, unlocknameCommand } from "./lockname.js";
import { messageCommand } from "./message.js";
import type { ChatInputCommandInteraction } from "discord.js";

export interface BotCommand {
  data: { name: string; toJSON: () => unknown };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands: BotCommand[] = [
  ticketCommand,
  totalCommand,
  banCommand,
  kickCommand,
  addroleCommand,
  lockchannelCommand,
  unlockchannelCommand,
  dmCommand,
  locknameCommand,
  unlocknameCommand,
  messageCommand,
];

export const commandMap = new Collection<string, BotCommand>(
  commands.map((cmd) => [cmd.data.name, cmd])
);
