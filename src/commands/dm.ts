import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { requireCrown } from "../utils/permissions.js";

export const dmCommand = {
  data: new SlashCommandBuilder()
    .setName("dm")
    .setDescription("Envoyer un message privé à un utilisateur")
    .addUserOption((opt) =>
      opt
        .setName("utilisateur")
        .setDescription("Destinataire du message")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("message")
        .setDescription("Contenu du message privé")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireCrown(interaction))) return;

    const user = interaction.options.getUser("utilisateur", true);
    const message = interaction.options.getString("message", true);

    try {
      await user.send(message);
      await interaction.reply({
        content: `✅ Message privé envoyé à **${user.tag}**.`,
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        content: "❌ Impossible d'envoyer le message (DMs fermés ou utilisateur introuvable).",
        ephemeral: true,
      });
    }
  },
};
