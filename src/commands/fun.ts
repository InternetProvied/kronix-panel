import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { hasMemberAccess } from "../utils/permissions.js";

export const pingCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Vérifie la latence du bot"),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const ping = interaction.client.ws.ping;
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("🏓 Pong!")
      .setDescription(`Latence: **${ping}ms**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export const diceCommand = {
  data: new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Lance un dé 🎲")
    .addIntegerOption((option) =>
      option
        .setName("faces")
        .setDescription("Nombre de faces (1-100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const faces = interaction.options.getInteger("faces") || 6;
    const result = Math.floor(Math.random() * faces) + 1;

    const embed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("🎲 Résultat du dé")
      .setDescription(`Vous avez lancé un dé à ${faces} faces\n**Résultat: ${result}**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export const coinCommand = {
  data: new SlashCommandBuilder()
    .setName("coin")
    .setDescription("Lance une pièce de monnaie 🪙"),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const result = Math.random() < 0.5 ? "Pile 🪙" : "Face 🪙";

    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("Lancer de pièce")
      .setDescription(`**${result}**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export const jokeCommand = {
  data: new SlashCommandBuilder()
    .setName("joke")
    .setDescription("Raconte une blague aléatoire 😂"),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const jokes = [
      "Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que si ils plongeaient en avant, ils tombent dans le bateau !",
      "Qu'est-ce qu'un crocodile qui surveille la pharmacie ? Un Lacoste-gard !",
      "Quel est le comble pour un électricien ? De ne pas être au courant !",
      "Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ? Un chat-peint de Noël !",
      "Qu'est-ce qu'un canif ? Un petit fien !",
      "Pourquoi les poissons n'aiment pas jouer au tennis ? Parce qu'ils ont peur du filet !",
      "Quel est le sport préféré des arbres ? Le tennis, évidemment !",
    ];

    const joke = jokes[Math.floor(Math.random() * jokes.length)];

    const embed = new EmbedBuilder()
      .setColor("#FF69B4")
      .setTitle("😂 Blague aléatoire")
      .setDescription(joke)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export const eightballCommand = {
  data: new SlashCommandBuilder()
    .setName("eightball")
    .setDescription("Pose une question à la boule magique 🔮")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("Votre question")
        .setRequired(true)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const question = interaction.options.getString("question") || "Aucune question";
    const responses = [
      "Oui, certainement",
      "Non, pas du tout",
      "Peut-être",
      "Les signes pointent vers oui",
      "Les signes pointent vers non",
      "Demande plus tard",
      "Je ne peux pas prédire maintenant",
      "C'est certain",
      "Sans doute",
      "Très douteux",
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];

    const embed = new EmbedBuilder()
      .setColor("#4B0082")
      .setTitle("🔮 Boule magique")
      .addFields(
        { name: "❓ Question", value: question },
        { name: "✨ Réponse", value: response }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export const userInfoCommand = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Affiche les infos d'un utilisateur 👤")
    .addUserOption((option) =>
      option
        .setName("utilisateur")
        .setDescription("L'utilisateur à vérifier")
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const user = interaction.options.getUser("utilisateur") || interaction.user;
    const member = await interaction.guild?.members.fetch(user.id);

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(`Infos de ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ size: 512 }))
      .addFields(
        { name: "ID", value: user.id, inline: true },
        { name: "Username", value: user.username, inline: true },
        {
          name: "Créé",
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
          inline: true,
        }
      );

    if (member) {
      embed.addFields(
        {
          name: "Rejoint",
          value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`,
          inline: true,
        },
        {
          name: "Rôles",
          value:
            member.roles.cache
              .filter((r) => r.id !== member.guild.id)
              .map((r) => r.toString())
              .join(", ") || "Aucun rôle",
          inline: false,
        }
      );
    }

    await interaction.reply({ embeds: [embed] });
  },
};
