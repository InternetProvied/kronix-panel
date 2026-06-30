import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { requireCrown } from "../utils/permissions.js";
import { loadData, saveData } from "../utils/storage.js";

export const locknameCommand = {
  data: new SlashCommandBuilder()
    .setName("lockname")
    .setDescription("Verrouiller le pseudo d'un membre")
    .addUserOption((opt) =>
      opt.setName("utilisateur").setDescription("Membre cible").setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("pseudo")
        .setDescription("Pseudo imposé")
        .setRequired(true)
        .setMaxLength(32)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireCrown(interaction))) return;

    const user = interaction.options.getUser("utilisateur", true);
    const pseudo = interaction.options.getString("pseudo", true);
    const guild = interaction.guild!;

    try {
      const member = await guild.members.fetch(user.id);
      await member.setNickname(pseudo, "Lockname par le propriétaire");

      const data = loadData();
      data.lockedNames = data.lockedNames.filter((l) => l.userId !== user.id);
      data.lockedNames.push({
        userId: user.id,
        nickname: pseudo,
        lockedAt: Date.now(),
      });
      saveData(data);

      await interaction.reply({
        content: `🔒 Pseudo de **${user.tag}** verrouillé sur **${pseudo}**.`,
      });
    } catch {
      await interaction.reply({
        content: "❌ Impossible de verrouiller le pseudo (permissions ou hiérarchie).",
        ephemeral: true,
      });
    }
  },
};

export const unlocknameCommand = {
  data: new SlashCommandBuilder()
    .setName("unlockname")
    .setDescription("Déverrouiller le pseudo d'un membre")
    .addUserOption((opt) =>
      opt.setName("utilisateur").setDescription("Membre cible").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireCrown(interaction))) return;

    const user = interaction.options.getUser("utilisateur", true);
    const data = loadData();
    const index = data.lockedNames.findIndex((l) => l.userId === user.id);

    if (index === -1) {
      await interaction.reply({
        content: "❌ Ce membre n'a pas de pseudo verrouillé.",
        ephemeral: true,
      });
      return;
    }

    data.lockedNames.splice(index, 1);
    saveData(data);

    await interaction.reply({
      content: `🔓 Pseudo de **${user.tag}** déverrouillé.`,
    });
  },
};
