import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";
import { requireCrown } from "../utils/permissions.js";

export const messageCommand = {
  data: new SlashCommandBuilder()
    .setName("message")
    .setDescription("Envoyer un message dans un salon via le bot")
    .addStringOption((opt) =>
      opt
        .setName("contenu")
        .setDescription("Message à envoyer")
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName("salon")
        .setDescription("Salon cible (salon actuel par défaut)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireCrown(interaction))) return;

    const content = interaction.options.getString("contenu", true);
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
      await channel.send(content);
      await interaction.reply({
        content: `✅ Message envoyé dans ${channel}.`,
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        content: "❌ Impossible d'envoyer le message dans ce salon.",
        ephemeral: true,
      });
    }
  },
};
