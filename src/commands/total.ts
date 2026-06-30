import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { requireCrown } from "../utils/permissions.js";
import { loadData } from "../utils/storage.js";

export const totalCommand = {
  data: new SlashCommandBuilder()
    .setName("total")
    .setDescription("Afficher les statistiques des tickets"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireCrown(interaction))) return;

    const data = loadData();
    const openTickets = data.tickets.filter((t) => !t.closed);
    const closedTickets = data.tickets.filter((t) => t.closed);
    const lockedNames = data.lockedNames.length;

    await interaction.reply({
      content: [
        "📊 **Statistiques du bot**",
        `🎫 Tickets ouverts : **${openTickets.length}**`,
        `✅ Tickets fermés : **${closedTickets.length}**`,
        `📋 Total tickets : **${data.tickets.length}**`,
        `🔒 Pseudos verrouillés : **${lockedNames}**`,
      ].join("\n"),
      ephemeral: true,
    });
  },
};
