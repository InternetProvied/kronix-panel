import {
  AuditLogEvent,
  Guild,
  GuildMember,
  GuildAuditLogsEntry,
  User,
} from "discord.js";
import {
  loadData,
  saveData,
  getOrCreateDailyRecord,
  MAX_DAILY_BANS,
  MAX_DAILY_KICKS,
} from "../utils/storage.js";
import { derankMember } from "../utils/permissions.js";

async function getRecentAuditEntry(
  guild: Guild,
  targetId: string,
  type: AuditLogEvent
): Promise<GuildAuditLogsEntry | null> {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 5 });
    return (
      logs.entries.find(
        (e) => e.targetId === targetId && Date.now() - e.createdTimestamp < 5000
      ) ?? null
    );
  } catch {
    return null;
  }
}

async function processModerationAction(
  executor: GuildMember,
  action: "ban" | "kick"
): Promise<void> {
  if (executor.id === executor.guild.ownerId) return;
  if (executor.user.bot) return;

  const data = loadData();
  const record = getOrCreateDailyRecord(data, executor.id);

  if (action === "ban") {
    record.bans++;
    saveData(data);
    if (record.bans > MAX_DAILY_BANS) {
      await derankMember(
        executor,
        `Dépassement de la limite de ${MAX_DAILY_BANS} bans par jour`
      );
    }
  } else {
    record.kicks++;
    saveData(data);
    if (record.kicks > MAX_DAILY_KICKS) {
      await derankMember(
        executor,
        `Dépassement de la limite de ${MAX_DAILY_KICKS} kicks par jour`
      );
    }
  }
}

export async function handleMemberBan(guild: Guild, user: User): Promise<void> {
  const entry = await getRecentAuditEntry(
    guild,
    user.id,
    AuditLogEvent.MemberBanAdd
  );
  if (!entry?.executorId) return;

  const executor = await guild.members.fetch(entry.executorId).catch(() => null);
  if (!executor) return;

  await processModerationAction(executor, "ban");
}

export async function handleMemberRemove(
  guild: Guild,
  userId: string
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const entry = await getRecentAuditEntry(
    guild,
    userId,
    AuditLogEvent.MemberKick
  );
  if (!entry?.executorId) return;

  const executor = await guild.members.fetch(entry.executorId).catch(() => null);
  if (!executor) return;

  await processModerationAction(executor, "kick");
}
