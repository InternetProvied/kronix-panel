import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { requireCrown } from "../utils/permissions.js";
import { checkKickLimitAndDerank } from "./ban.js";

export const kickCommand = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulser un membre (max 4 par jour)")
    .addUserOption((opt) =>
      opt
        .setName("utilisateur")
        .setDescription("Membre à expulser")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("raison").setDescription("Raison du kick").setRequired(false)
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
        content: "❌ Impossible d'expulser le propriétaire du serveur.",
        ephemeral: true,
      });
      return;
    }

    const isOwner = interaction.user.id === guild.ownerId;

    if (!isOwner) {
      const limitCheck = await checkKickLimitAndDerank(executor);
      if (!limitCheck.allowed) {
        await interaction.reply({ content: limitCheck.message, ephemeral: true });
        return;
      }
    }

    try {
      const member = await guild.members.fetch(target.id);
      await member.kick(`[${interaction.user.tag}] ${reason}`);
      await interaction.reply({
        content: `✅ **${target.tag}** a été expulsé.\nRaison : ${reason}`,
      });
    } catch {
      await interaction.reply({
        content: "❌ Impossible d'expulser ce membre (permissions ou hiérarchie).",
        ephemeral: true,
      });
    }
  },
};
