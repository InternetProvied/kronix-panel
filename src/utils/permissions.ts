import {
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";

export const founderRoleId = process.env.FOUNDER_ROLE_ID || "1474852405601505394";

export function hasFounderAccess(member: GuildMember | null | undefined): boolean {
  if (!member?.roles?.cache) return false;

  if (founderRoleId && member.roles.cache.has(founderRoleId)) {
    return true;
  }

  return member.roles.cache.some((role) => {
    const normalizedName = role.name.toLowerCase();
    return normalizedName === "fondateur" || normalizedName === "founder";
  });
}

export function isCrown(interaction: ChatInputCommandInteraction): boolean {
  const guild = interaction.guild;
  if (!guild) return false;

  const member = interaction.member;
  if (member && "roles" in member && hasFounderAccess(member as GuildMember)) {
    return true;
  }

  return interaction.user.id === guild.ownerId;
}

export async function requireCrown(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({
      content: "❌ Cette commande ne peut être utilisée que sur un serveur.",
      ephemeral: true,
    });
    return false;
  }

  const member = interaction.member;
  const hasAccess =
    (member && "roles" in member && hasFounderAccess(member as GuildMember)) ||
    interaction.user.id === guild.ownerId;

  if (hasAccess) return true;

  const reply = {
    content:
      "❌ Tu n’as pas le rôle fondateur, tu ne peux pas utiliser cette commande.",
    ephemeral: true,
  };

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(reply).catch(() => {});
  } else {
    await interaction.reply(reply).catch(() => {});
  }

  return false;
}

export function getHighestRole(member: GuildMember) {
  return member.roles.cache
    .filter((r) => r.id !== member.guild.id)
    .sort((a, b) => b.position - a.position)
    .first();
}

export async function derankMember(
  member: GuildMember,
  reason: string
): Promise<string | null> {
  const highestRole = getHighestRole(member);
  if (!highestRole) {
    return "Aucun rôle à retirer.";
  }
  try {
    await member.roles.remove(highestRole, reason);
    return `Rôle **${highestRole.name}** retiré pour dépassement de la limite quotidienne.`;
  } catch {
    return "Impossible de retirer le rôle (permissions insuffisantes).";
  }
}

export function botHasPermissions(member: GuildMember): boolean {
  const me = member.guild.members.me;
  if (!me) return false;
  return me.permissions.has(PermissionFlagsBits.Administrator);
}
