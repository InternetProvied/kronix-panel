import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  EmbedBuilder,
  OverwriteType,
  type ButtonInteraction,
} from "discord.js";
import { hasFounderAccess } from "../utils/permissions.js";
import { loadData, saveData } from "../utils/storage.js";

function isTextChannel(channel: unknown): channel is TextChannel {
  return Boolean(channel && typeof channel === "object" && "type" in channel && (channel as TextChannel).type === ChannelType.GuildText);
}

export const ticketCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Configurer ou créer le système de tickets")
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Publier le panneau de création de tickets")
        .addChannelOption((opt) =>
          opt
            .setName("salon")
            .setDescription("Salon où envoyer le panneau")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("salon_demande")
            .setDescription("Salon où envoyer les demandes de tickets")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("categorie")
            .setDescription("Catégorie pour les tickets")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("close").setDescription("Fermer le ticket actuel")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const { requireCrown } = await import("../utils/permissions.js");
    if (!(await requireCrown(interaction))) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "setup") {
      const panelChannel = interaction.options.getChannel("salon", true);
      const requestChannel = interaction.options.getChannel("salon_demande", true);
      const category = interaction.options.getChannel("categorie", true);

      if (!isTextChannel(panelChannel) || !isTextChannel(requestChannel)) {
        await interaction.reply({
          content: "❌ Les salons doivent être de type texte.",
          ephemeral: true,
        });
        return;
      }

      const data = loadData();
      data.ticketCategoryId = category.id;
      data.ticketRequestChannelId = requestChannel.id;
      saveData(data);

      const embed = new EmbedBuilder()
        .setTitle("🎫 Demande de ticket")
        .setDescription(
          "Cliquez sur le bouton ci-dessous pour envoyer une demande au staff.\nVotre demande sera ensuite acceptée ou refusée."
        )
        .setColor(0x5865f2);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("Créer une demande")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🎫")
      );

      await panelChannel.send({ embeds: [embed], components: [row] });

      await interaction.reply({
        content: `✅ Panneau configuré dans ${panelChannel}. Demandes envoyées dans ${requestChannel}. Catégorie : ${category.name}`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "close") {
      const channel = interaction.channel;
      if (!isTextChannel(channel)) {
        await interaction.reply({
          content: "❌ Cette commande doit être utilisée dans un salon de ticket.",
          ephemeral: true,
        });
        return;
      }

      const data = loadData();
      const ticket = data.tickets.find(
        (t) => t.channelId === channel.id && !t.closed
      );

      if (!ticket) {
        await interaction.reply({
          content: "❌ Ce salon n'est pas un ticket actif.",
          ephemeral: true,
        });
        return;
      }

      ticket.closed = true;
      ticket.status = "rejected";
      saveData(data);

      await interaction.reply("🔒 Ticket fermé. Suppression du salon dans 5 secondes...");
      setTimeout(async () => {
        try {
          await channel.delete("Ticket fermé");
        } catch {
          /* salon déjà supprimé */
        }
      }, 5000);
    }
  },
};

export async function handleCreateTicketButton(interaction: ButtonInteraction) {
  const data = loadData();
  if (!data.ticketCategoryId || !data.ticketRequestChannelId) {
    await interaction.reply({
      content: "❌ Le système de tickets n'est pas configuré.",
      ephemeral: true,
    });
    return;
  }

  const existing = data.tickets.find(
    (t) => t.userId === interaction.user.id && !t.closed && (t.status === "pending" || t.status === "accepted")
  );
  if (existing) {
    await interaction.reply({
      content: existing.channelId
        ? `❌ Vous avez déjà un ticket ouvert : <#${existing.channelId}>`
        : "❌ Vous avez déjà une demande de ticket en attente.",
      ephemeral: true,
    });
    return;
  }

  const guild = interaction.guild;
  if (!guild) return;

  const requestChannel = await guild.channels.fetch(data.ticketRequestChannelId);
  if (!isTextChannel(requestChannel)) {
    await interaction.reply({
      content: "❌ Le salon de demandes de tickets est introuvable ou invalide.",
      ephemeral: true,
    });
    return;
  }

  const requestId = `${interaction.user.id}-${Date.now()}`;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_ticket:${requestId}`)
      .setLabel("Accepter")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reject_ticket:${requestId}`)
      .setLabel("Refuser")
      .setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setTitle("🎫 Nouvelle demande de ticket")
    .setDescription(`Demande envoyée par <@${interaction.user.id}>`)
    .addFields(
      { name: "Utilisateur", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Statut", value: "En attente de validation", inline: true }
    )
    .setColor(0xFFD700);

  const requestMessage = await requestChannel.send({
    content: `📩 Nouvelle demande de ticket de <@${interaction.user.id}>`,
    embeds: [embed],
    components: [row],
  });

  data.tickets.push({
    channelId: null,
    userId: interaction.user.id,
    createdAt: Date.now(),
    closed: false,
    status: "pending",
    requestChannelId: requestChannel.id,
    requestMessageId: requestMessage.id,
    requestId,
    acceptedBy: null,
  });
  saveData(data);

  await interaction.reply({
    content: "✅ Votre demande a été envoyée au staff. Elle sera acceptée ou refusée dans le salon de demandes.",
    ephemeral: true,
  });
}

export async function handleCloseTicketButton(interaction: ButtonInteraction) {
  const channel = interaction.channel;
  if (!isTextChannel(channel)) return;

  const data = loadData();
  const ticket = data.tickets.find(
    (t) => t.channelId === channel.id && !t.closed
  );

  if (!ticket) {
    await interaction.reply({
      content: "❌ Ce salon n'est pas un ticket actif.",
      ephemeral: true,
    });
    return;
  }

  const isOwner = interaction.user.id === interaction.guild?.ownerId;
  const isTicketOwner = interaction.user.id === ticket.userId;
  const canStaffManage =
    interaction.member && "permissions" in interaction.member &&
    typeof interaction.member.permissions !== "string"
      ? interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)
      : false;

  if (!isOwner && !isTicketOwner && !canStaffManage) {
    await interaction.reply({
      content: "❌ Seul le propriétaire du serveur, le créateur du ticket ou un membre du staff peut le fermer.",
      ephemeral: true,
    });
    return;
  }

  ticket.closed = true;
  ticket.status = "rejected";
  saveData(data);

  await interaction.reply("🔒 Ticket fermé. Suppression du salon dans 5 secondes...");
  setTimeout(async () => {
    try {
      await channel.delete("Ticket fermé");
    } catch {
      /* ignore */
    }
  }, 5000);
}

export async function handleTicketDecisionButton(interaction: ButtonInteraction) {
  if (!interaction.guild) return;

  const isStaff = hasFounderAccess(interaction.member as any) ||
    (interaction.member && "permissions" in interaction.member &&
    typeof interaction.member.permissions !== "string"
      ? interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)
      : false);

  if (!isStaff) {
    await interaction.reply({
      content: "❌ Seul le staff peut accepter ou refuser une demande de ticket.",
      ephemeral: true,
    });
    return;
  }

  const [, requestId] = interaction.customId.split(":");
  const data = loadData();
  const ticket = data.tickets.find((t) => t.requestId === requestId && !t.closed);

  if (!ticket) {
    await interaction.reply({
      content: "❌ Cette demande de ticket n'existe plus.",
      ephemeral: true,
    });
    return;
  }

  const isAccept = interaction.customId.startsWith("accept_ticket");

  if (isAccept) {
    const categoryId = data.ticketCategoryId;
    if (!categoryId) {
      await interaction.reply({
        content: "❌ Aucune catégorie de tickets n'a été configurée.",
        ephemeral: true,
      });
      return;
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${ticket.userId}`,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          type: OverwriteType.Role,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: ticket.userId,
          type: OverwriteType.Member,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: interaction.user.id,
          type: OverwriteType.Member,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
          ],
        },
        {
          id: interaction.guild.members.me?.id ?? interaction.guild.ownerId,
          type: OverwriteType.Member,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
          ],
        },
        {
          id: interaction.guild.ownerId,
          type: OverwriteType.Member,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
          ],
        },
      ],
    });

    ticket.channelId = channel.id;
    ticket.status = "accepted";
    ticket.acceptedBy = interaction.user.id;
    saveData(data);

    const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Fermer le ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `${interaction.user} a accepté le ticket de <@${ticket.userId}>.\nDécrivez votre problème ci-dessous.`,
      components: [closeRow],
    });

    try {
      const member = await interaction.guild.members.fetch(ticket.userId);
      await member.send({
        content: `✅ Votre ticket a été accepté. Vous pouvez utiliser le salon ${channel}.`,
      });
    } catch {
      // Le membre a peut-être désactivé ses MP.
    }

    if (interaction.message) {
      await interaction.message.edit({
        content: `✅ Demande acceptée par ${interaction.user}. Salon ouvert : ${channel}`,
        components: [],
      });
    }

    await interaction.reply({
      content: `✅ Ticket ouvert : ${channel}`,
      ephemeral: true,
    });
    return;
  }

  ticket.status = "rejected";
  ticket.closed = true;
  saveData(data);

  if (interaction.message) {
    await interaction.message.edit({
      content: `❌ Demande refusée par ${interaction.user}.`,
      components: [],
    });
  }

  await interaction.reply({
    content: "✅ La demande de ticket a été refusée.",
    ephemeral: true,
  });
}
