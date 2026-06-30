import { GuildMember } from "discord.js";
import { loadData } from "../utils/storage.js";

export async function handleNicknameLock(
  oldMember: GuildMember,
  newMember: GuildMember
): Promise<void> {
  if (oldMember.nickname === newMember.nickname) return;

  const data = loadData();
  const lock = data.lockedNames.find((l) => l.userId === newMember.id);
  if (!lock) return;

  if (newMember.nickname !== lock.nickname) {
    try {
      await newMember.setNickname(
        lock.nickname,
        "Lockname — pseudo imposé par le propriétaire"
      );
    } catch {
      /* permissions insuffisantes */
    }
  }
}
