import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  ChannelType,
} from "discord.js";
import { requireMemberAccess } from "../utils/permissions.js";

export const muteCommand = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Rend muet un utilisateur 🔇")
    .addUserOption((option) =>
      option
        .setName("utilisateur")
        .setDescription("L'utilisateur à rendre muet")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("Raison du mute")
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const hasAccess = await requireMemberAccess(interaction);
    if (!hasAccess) return;

    const user = interaction.options.getUser("utilisateur", true);
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";
    const member = await interaction.guild?.members.fetch(user.id);

    if (!member) {
      await interaction.reply({
        content: "❌ Utilisateur non trouvé",
        ephemeral: true,
      });
      return;
    }

    try {
      await member.disableCommunicationUntil(
        Date.now() + 1000 * 60 * 60,
        reason
      );

      const embed = new EmbedBuilder()
        .setColor("#FF6B6B")
        .setTitle("🔇 Utilisateur rendu muet")
        .addFields(
          { name: "Utilisateur", value: `<@${user.id}>` },
          { name: "Durée", value: "1 heure" },
          { name: "Raison", value: reason }
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: "❌ Erreur lors du mute",
        ephemeral: true,
      });
    }
  },
};

export const unmuteCommand = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Retire le mute d'un utilisateur 🔊")
    .addUserOption((option) =>
      option
        .setName("utilisateur")
        .setDescription("L'utilisateur à dé-mute")
        .setRequired(true)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const hasAccess = await requireMemberAccess(interaction);
    if (!hasAccess) return;

    const user = interaction.options.getUser("utilisateur", true);
    const member = await interaction.guild?.members.fetch(user.id);

    if (!member) {
      await interaction.reply({
        content: "❌ Utilisateur non trouvé",
        ephemeral: true,
      });
      return;
    }

    try {
      await member.disableCommunicationUntil(null);

      const embed = new EmbedBuilder()
        .setColor("#4CAF50")
        .setTitle("🔊 Mute retiré")
        .addFields({ name: "Utilisateur", value: `<@${user.id}>` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: "❌ Erreur lors du unmute",
        ephemeral: true,
      });
    }
  },
};

export const warnCommand = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Avertir un utilisateur ⚠️")
    .addUserOption((option) =>
      option
        .setName("utilisateur")
        .setDescription("L'utilisateur à avertir")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("Raison de l'avertissement")
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const hasAccess = await requireMemberAccess(interaction);
    if (!hasAccess) return;

    const user = interaction.options.getUser("utilisateur", true);
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";

    const embed = new EmbedBuilder()
      .setColor("#FFC107")
      .setTitle("⚠️ Avertissement")
      .addFields(
        { name: "Utilisateur", value: `<@${user.id}>` },
        { name: "Raison", value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    try {
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#FFC107")
            .setTitle("⚠️ Vous avez reçu un avertissement")
            .setDescription(`Raison: ${reason}`)
            .setTimestamp(),
        ],
      });
    } catch (error) {
      console.log("Impossible d'envoyer un MP");
    }
  },
};

export const clearCommand = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Supprime des messages d'un canal 🗑️")
    .addIntegerOption((option) =>
      option
        .setName("nombre")
        .setDescription("Nombre de messages à supprimer (1-100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const hasAccess = await requireMemberAccess(interaction);
    if (!hasAccess) return;

    const amount = interaction.options.getInteger("nombre", true);

    if (!interaction.channel || interaction.channel.type === ChannelType.DM) {
      await interaction.reply({
        content: "❌ Cette commande ne peut être utilisée que dans un canal texte de serveur",
        ephemeral: true,
      });
      return;
    }

    if (!interaction.channel.isTextBased() || !('bulkDelete' in interaction.channel)) {
      await interaction.reply({
        content: "❌ Ce canal ne supporte pas la suppression en masse",
        ephemeral: true,
      });
      return;
    }

    try {
      const deleted = await interaction.channel.bulkDelete(amount);

      const embed = new EmbedBuilder()
        .setColor("#4CAF50")
        .setTitle("🗑️ Messages supprimés")
        .setDescription(`**${deleted.size}** messages supprimés`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: "❌ Erreur lors de la suppression des messages",
        ephemeral: true,
      });
    }
  },
};

export const slowmodeCommand = {
  data: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Active le mode lent d'un canal 🐌")
    .addIntegerOption((option) =>
      option
        .setName("secondes")
        .setDescription("Délai en secondes (0 pour désactiver)")
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const hasAccess = await requireMemberAccess(interaction);
    if (!hasAccess) return;

    const delay = interaction.options.getInteger("secondes", true);

    if (!interaction.channel || interaction.channel.type === ChannelType.DM) {
      await interaction.reply({
        content: "❌ Cette commande ne peut être utilisée que dans un canal texte de serveur",
        ephemeral: true,
      });
      return;
    }

    if (!interaction.channel.isTextBased() || !('setRateLimitPerUser' in interaction.channel)) {
      await interaction.reply({
        content: "❌ Ce canal ne supporte pas le mode lent",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.channel.setRateLimitPerUser(delay);

      const embed = new EmbedBuilder()
        .setColor("#2196F3")
        .setTitle("🐌 Mode lent")
        .setDescription(
          delay === 0
            ? "Mode lent désactivé"
            : `Mode lent activé: **${delay}** secondes`
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: "❌ Erreur lors de la modification du mode lent",
        ephemeral: true,
      });
    }
  },
};

// Helper function for member access check - REMOVED (already in permissions.ts)
