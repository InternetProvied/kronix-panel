import dotenv from "dotenv";
dotenv.config();
import express from "express";
import {
  Client,
  GatewayIntentBits,
  Events,
  Interaction,
  GuildMember,
} from "discord.js";
import { commandMap } from "./commands/index.js";
import {
  handleCreateTicketButton,
  handleCloseTicketButton,
  handleTicketDecisionButton,
} from "./commands/ticket.js";
import { handleNicknameLock } from "./events/lockname.js";
import { handleMemberBan, handleMemberRemove } from "./events/moderation.js";

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("❌ DISCORD_TOKEN manquant dans .env");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot connecté en tant que ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commandMap.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Erreur commande /${interaction.commandName}:`, error);
      const reply = {
        content: "❌ Une erreur est survenue lors de l'exécution de la commande.",
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === "create_ticket") {
      await handleCreateTicketButton(interaction).catch(console.error);
    } else if (interaction.customId === "close_ticket") {
      await handleCloseTicketButton(interaction).catch(console.error);
    } else if (
      interaction.customId.startsWith("accept_ticket") ||
      interaction.customId.startsWith("reject_ticket")
    ) {
      await handleTicketDecisionButton(interaction).catch(console.error);
    }
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  let oldFull = oldMember;
  let newFull = newMember;

  if (oldMember.partial) {
    try {
      oldFull = await oldMember.fetch();
    } catch {
      return;
    }
  }
  if (newMember.partial) {
    try {
      newFull = await newMember.fetch();
    } catch {
      return;
    }
  }

  await handleNicknameLock(
    oldFull as GuildMember,
    newFull as GuildMember
  ).catch(console.error);
});

client.on(Events.GuildBanAdd, async (ban) => {
  if (!ban.guild) return;
  await handleMemberBan(ban.guild, ban.user).catch(console.error);
});

client.on(Events.GuildMemberRemove, async (member) => {
  if (!member.guild) return;
  await handleMemberRemove(member.guild, member.id).catch(console.error);
});

// Express web server pour Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("✅ Bot Discord is running");
});

app.listen(PORT, () => {
  console.log(`✅ Serveur web écoute sur le port ${PORT}`);
});

client.login(token);
