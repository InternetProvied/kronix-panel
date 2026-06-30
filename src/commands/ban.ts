import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { requireCrown, derankMember } from "../utils/permissions.js";
import {
  loadData,
  saveData,
  getOrCreateDailyRecord,
  MAX_DAILY_BANS,
} from "../utils/storage.js";

export const banCommand = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannir un membre (max 4 par jour)")
    .addUserOption((opt) =>
      opt.setName("utilisateur").setDescription("Membre à bannir").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("raison").setDescription("Raison du ban").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireCrown(interaction))) return;

    const target = interaction.options.getUser("utilisateur", true);
    const reason =
      interaction.options.getString("raison") ?? "Aucune raison spécifiée";
    const guild = interaction.guild!;
    const executor = interaction.member as import("discord.js").GuildMember;

    if (target.id === guild.ownerId) {
      await interaction.reply({
        content: "❌ Impossible de bannir le propriétaire du serveur.",
        ephemeral: true,
      });
      return;
    }

    const data = loadData();
    const record = getOrCreateDailyRecord(data, interaction.user.id);

    const isOwner = interaction.user.id === guild.ownerId;

    if (record.bans >= MAX_DAILY_BANS && !isOwner) {
      const derankMsg = await derankMember(
        executor,
        "Dépassement de la limite de 4 bans par jour"
      );
      await interaction.reply({
        content: `❌ Limite de **${MAX_DAILY_BANS} bans par jour** atteinte.\n${derankMsg}`,
        ephemeral: true,
      });
      return;
    }

    try {
      await guild.members.ban(target.id, { reason: `[${interaction.user.tag}] ${reason}` });
      record.bans++;
      saveData(data);

      await interaction.reply({
        content: `✅ **${target.tag}** a été banni.\nRaison : ${reason}\n(Bans aujourd'hui : ${record.bans}/${MAX_DAILY_BANS})`,
      });
    } catch {
      await interaction.reply({
        content: "❌ Impossible de bannir ce membre (permissions ou hiérarchie).",
        ephemeral: true,
      });
    }
  },
};

export async function trackKick(userId: string): Promise<{
  allowed: boolean;
  derankMessage: string | null;
}> {
  const data = loadData();
  const record = getOrCreateDailyRecord(data, userId);

  if (record.kicks >= 4) {
    return { allowed: false, derankMessage: null };
  }

  record.kicks++;
  saveData(data);
  return { allowed: true, derankMessage: null };
}

export async function checkKickLimitAndDerank(
  member: import("discord.js").GuildMember
): Promise<{ allowed: boolean; message: string }> {
  const data = loadData();
  const record = getOrCreateDailyRecord(data, member.id);

  if (record.kicks < 4) {
    record.kicks++;
    saveData(data);
    return {
      allowed: true,
      message: `Kick effectué (${record.kicks}/4 aujourd'hui)`,
    };
  }

  const derankMsg = await derankMember(
    member,
    "Dépassement de la limite de 4 kicks par jour"
  );
  return {
    allowed: false,
    message: `❌ Limite de 4 kicks par jour atteinte.\n${derankMsg}`,
  };
}
