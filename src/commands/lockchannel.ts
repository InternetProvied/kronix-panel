import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { requireCrown } from "../utils/permissions.js";

export const lockchannelCommand = {
  data: new SlashCommandBuilder()
    .setName("lockchannel")
    .setDescription("Verrouiller le salon actuel (personne ne peut plus écrire)")
    .addChannelOption((opt) =>
      opt
        .setName("salon")
        .setDescription("Salon à verrouiller (salon actuel par défaut)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireCrown(interaction))) return;

    const channel =
      (interaction.options.getChannel("salon") as TextChannel | null) ??
      (interaction.channel as TextChannel);

    if (!channel?.isTextBased()) {
      await interaction.reply({
        content: "❌ Salon invalide.",
        ephemeral: true,
      });
      return;
    }

    try {
      await channel.permissionOverwrites.edit(interaction.guildId!, {
        SendMessages: false,
      });
      await interaction.reply({
        content: `🔒 Salon ${channel} verrouillé.`,
      });
    } catch {
      await interaction.reply({
        content: "❌ Impossible de verrouiller ce salon.",
        ephemeral: true,
      });
    }
  },
};

export const unlockchannelCommand = {
  data: new SlashCommandBuilder()
    .setName("unlockchannel")
    .setDescription("Déverrouiller un salon")
    .addChannelOption((opt) =>
      opt
        .setName("salon")
        .setDescription("Salon à déverrouiller (salon actuel par défaut)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireCrown(interaction))) return;

    const channel =
      (interaction.options.getChannel("salon") as TextChannel | null) ??
      (interaction.channel as TextChannel);

    if (!channel?.isTextBased()) {
      await interaction.reply({
        content: "❌ Salon invalide.",
        ephemeral: true,
      });
      return;
    }

    try {
      await channel.permissionOverwrites.edit(interaction.guildId!, {
        SendMessages: null,
      });
      await interaction.reply({
        content: `🔓 Salon ${channel} déverrouillé.`,
      });
    } catch {
      await interaction.reply({
        content: "❌ Impossible de déverrouiller ce salon.",
        ephemeral: true,
      });
    }
  },
};
