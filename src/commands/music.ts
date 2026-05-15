import { SlashCommandBuilder } from "discord.js"
import type { BotCommand } from "../types/command"
import * as musicModule from "../modules/music"
import { updateQueue } from "../modules/music-console"

export const musicCommands: BotCommand[] = [
  {
    data: new SlashCommandBuilder()
      .setName("play")
      .setDescription("เล่นเพลง")
      .addStringOption((opt) =>
        opt.setName("song").setDescription("ชื่อเพลง / ลิงก์").setRequired(true),
      ),
    async execute(interaction) {
      await musicModule.play(interaction)
    },
  },
  {
    data: new SlashCommandBuilder().setName("pause").setDescription("หยุดเพลงชั่วคราว"),
    async execute(interaction) {
      await musicModule.pause(interaction)
    },
  },
  {
    data: new SlashCommandBuilder().setName("resume").setDescription("เล่นเพลงต่อ"),
    async execute(interaction) {
      await musicModule.resume(interaction)
    },
  },
  {
    data: new SlashCommandBuilder().setName("skip").setDescription("ไปเพลงต่อไป"),
    async execute(interaction) {
      await musicModule.skip(interaction)
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("stop")
      .setDescription("หยุดเพลงและลบคิว"),
    async execute(interaction) {
      await musicModule.stop(interaction)
    },
  },
  {
    data: new SlashCommandBuilder().setName("leave").setDescription("ออกจากห้อง"),
    async execute(interaction) {
      await musicModule.leaveChannel(interaction.guildId!)
      await interaction.deleteReply().catch(() => {})
    },
  },
  {
    data: new SlashCommandBuilder().setName("queue").setDescription("แสดงคิวเพลง"),
    async execute(interaction) {
      await updateQueue(interaction, musicModule.currentQueue(interaction.guildId!))
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("unqueue")
      .setDescription("ลบเพลงออกจากคิว")
      .addStringOption((opt) =>
        opt.setName("id").setDescription("id ของเพลงที่จะลบ").setRequired(true),
      ),
    async execute(interaction) {
      await interaction.editReply("ยังไม่ได้ทำ")
      setTimeout(() => interaction.deleteReply().catch(() => {}), 5000)
    },
  },
  {
    data: new SlashCommandBuilder().setName("clear").setDescription("เคลียคิว"),
    async execute(interaction) {
      musicModule.clearGuildQueue(interaction.guildId!)
      await updateQueue(interaction, musicModule.currentQueue(interaction.guildId!))
    },
  },
]
