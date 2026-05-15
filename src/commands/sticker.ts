import { SlashCommandBuilder } from "discord.js"
import type { BotCommand } from "../types/command"
import {
  checkPermissions,
  toSnakeCase,
  getServerCache,
  addSticker,
  editStickerDescription,
  deleteSticker,
  refreshServerCache,
  generateGalleryToken,
} from "../modules/stickers"
import { env } from "../config/env"
import { REST, Routes } from "discord.js"

export const staticStickerCommands: BotCommand[] = [
  {
    data: new SlashCommandBuilder()
      .setName("add_sticker")
      .setDescription("ก็แอด sticker ไง")
      .addStringOption((opt) =>
        opt.setName("sticker_name").setDescription("ชื่อสติกเกอร์").setRequired(true),
      )
      .addStringOption((opt) =>
        opt.setName("message_url").setDescription("ลิงก์รูปภาพ").setRequired(true),
      )
      .addStringOption((opt) =>
        opt.setName("sticker_description").setDescription("คำอธิบาย").setRequired(false),
      ),
    async execute(interaction, clients) {
      const guildID = interaction.guildId!
      if (!checkPermissions(interaction.member as import("discord.js").GuildMember)) {
        await interaction.editReply("You don't have permissions")
        return
      }
      const name = toSnakeCase(interaction.options.getString("sticker_name", true))
      const url = interaction.options.getString("message_url", true)
      const desc = interaction.options.getString("sticker_description") ?? "สติกเกอร์โง่ๆอันนึง"

      const existing = await getServerCache(guildID)
      if (existing.some((s) => s.stickerName === name)) {
        await interaction.editReply("Sticker name already exists.")
        return
      }

      await addSticker(guildID, {
        stickerName: name,
        stickerUrl: url,
        stickerCreator: interaction.user.username,
        stickerDescription: desc,
      })

      await registerGuildStickerCommands(guildID, clients)
      await interaction.editReply(`${name} added`)
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("edit_sticker")
      .setDescription("แก้คำบรรยายสติกเกอร์")
      .addStringOption((opt) =>
        opt.setName("sticker_name").setDescription("ชื่อสติกเกอร์").setRequired(true),
      )
      .addStringOption((opt) =>
        opt.setName("sticker_description").setDescription("คำอธิบายใหม่").setRequired(true),
      ),
    async execute(interaction, clients) {
      const guildID = interaction.guildId!
      if (!checkPermissions(interaction.member as import("discord.js").GuildMember)) {
        await interaction.editReply("You don't have permissions")
        return
      }
      const name = toSnakeCase(interaction.options.getString("sticker_name", true))
      const desc = interaction.options.getString("sticker_description", true)

      const existing = await getServerCache(guildID)
      if (!existing.some((s) => s.stickerName === name)) {
        await interaction.editReply("Sticker does not exist.")
        return
      }

      await editStickerDescription(guildID, name, desc)
      await registerGuildStickerCommands(guildID, clients)
      await interaction.editReply(`${name} edited`)
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("delete_sticker")
      .setDescription("ลบสติกเกอร์")
      .addStringOption((opt) =>
        opt.setName("sticker_name").setDescription("ชื่อสติกเกอร์").setRequired(true),
      ),
    async execute(interaction, clients) {
      const guildID = interaction.guildId!
      if (!checkPermissions(interaction.member as import("discord.js").GuildMember)) {
        await interaction.editReply("You don't have permissions")
        return
      }
      const name = interaction.options.getString("sticker_name", true)
      await deleteSticker(guildID, name)
      await registerGuildStickerCommands(guildID, clients)
      await interaction.editReply(`${name} has been removed`)
    },
  },
  {
    data: new SlashCommandBuilder().setName("check_perm").setDescription("ตรวจสอบสิทธิ์"),
    async execute(interaction) {
      const perm = checkPermissions(interaction.member as import("discord.js").GuildMember)
        ? "allow"
        : "deny"
      await interaction.editReply(perm)
    },
  },
  {
    data: new SlashCommandBuilder().setName("list_sticker").setDescription("เปิด Gallery สติกเกอร์"),
    async execute(interaction) {
      const guildID = interaction.guildId!
      const stickers = await getServerCache(guildID)
      if (stickers.length === 0) {
        await interaction.editReply("No sticker on this server")
        return
      }
      const token = generateGalleryToken(guildID)
      await interaction.editReply(`https://stickers-gallary.herokuapp.com/?token=${token}`)
    },
  },
  {
    data: new SlashCommandBuilder().setName("fetch_sticker").setDescription("อัพเดทคำสั่งสติกเกอร์"),
    async execute(interaction, clients) {
      const guildID = interaction.guildId!
      if (!checkPermissions(interaction.member as import("discord.js").GuildMember)) {
        await interaction.editReply("You don't have permissions")
        return
      }
      const data = await refreshServerCache(guildID)
      await registerGuildStickerCommands(guildID, clients)
      await interaction.editReply(`Fetched ${data.length} stickers`)
    },
  },
]

export function buildStickerCommand(sticker: {
  stickerName: string
  stickerDescription?: string
}): object {
  return new SlashCommandBuilder()
    .setName(sticker.stickerName)
    .setDescription(sticker.stickerDescription ?? "สติกเกอร์โง่ๆอันนึง")
    .addBooleanOption((opt) =>
      opt
        .setName("mark_as_spoiled")
        .setDescription("Should this be spoiler?")
        .setRequired(false),
    )
    .toJSON()
}

export async function registerGuildStickerCommands(
  guildID: string,
  clients: import("../types/command").BotClients,
): Promise<void> {
  const stickers = await getServerCache(guildID)
  const midpoint = 90
  const primary = stickers.slice(0, midpoint)
  const secondary = stickers.slice(midpoint)

  const rest1 = new REST().setToken(env.discordToken)
  const rest2 = new REST().setToken(env.discordToken2)

  await rest1.put(Routes.applicationGuildCommands(env.discordClientID, guildID), {
    body: primary.map(buildStickerCommand),
  })

  if (secondary.length > 0) {
    await rest2.put(Routes.applicationGuildCommands(env.discordClientID2, guildID), {
      body: secondary.map(buildStickerCommand),
    })
  }
}

export async function isStickerCommand(guildID: string, commandName: string): Promise<boolean> {
  const stickers = await getServerCache(guildID)
  return stickers.some((s) => s.stickerName === commandName)
}

export async function handleStickerCommand(
  interaction: import("discord.js").ChatInputCommandInteraction,
): Promise<void> {
  const guildID = interaction.guildId!
  const stickers = await getServerCache(guildID)
  const sticker = stickers.find((s) => s.stickerName === interaction.commandName)
  if (!sticker) {
    await interaction.editReply("No sticker found")
    return
  }
  const spoiler = interaction.options.getBoolean("mark_as_spoiled") ?? false
  const url = spoiler ? `||${sticker.stickerUrl}||` : sticker.stickerUrl
  await interaction.editReply(url)
}
