import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error("❌ DISCORD_TOKEN, CLIENT_ID et GUILD_ID sont requis dans .env");
  process.exit(1);
}

const rest = new REST().setToken(token);

async function deploy() {
  const body = commands.map((cmd) => cmd.data.toJSON());

  console.log(`Enregistrement de ${body.length} commandes slash...`);

  await rest.put(Routes.applicationGuildCommands(clientId!, guildId!), {
    body,
  });

  console.log("✅ Commandes enregistrées avec succès !");
}

deploy().catch(console.error);
