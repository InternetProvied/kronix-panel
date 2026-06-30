import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { requireCrown } from "../utils/permissions.js";

export const addroleCommand = {
  data: new SlashCommandBuilder()
    .setName("addrole")
    .setDescription("Ajouter un rôle à un membre")
    .addUserOption((opt) =>
      opt.setName("utilisateur").setDescription("Membre cible").setRequired(true)
    )
    .addRoleOption((opt) =>
      opt.setName("role").setDescription("Rôle à ajouter").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireCrown(interaction))) return;

    const user = interaction.options.getUser("utilisateur", true);
    const guild = interaction.guild!;
    const roleId = interaction.options.getRole("role", true).id;
    const role = await guild.roles.fetch(roleId);
    if (!role) {
      await interaction.reply({
        content: "❌ Rôle introuvable.",
        ephemeral: true,
      });
      return;
    }

    try {
      const member = await guild.members.fetch(user.id);
      await member.roles.add(role);
      await interaction.reply({
        content: `✅ Rôle **${role.name}** ajouté à **${user.tag}**.`,
      });
    } catch {
      await interaction.reply({
        content: "❌ Impossible d'ajouter ce rôle (permissions ou hiérarchie).",
        ephemeral: true,
      });
    }
  },
};
