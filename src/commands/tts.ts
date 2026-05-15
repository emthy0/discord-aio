import { SlashCommandBuilder } from "discord.js"
import type { BotCommand } from "../types/command"
import { speak, stopTts } from "../modules/tts"
import { speakJai, stopJaiTts } from "../modules/jai-tts"
import { env } from "../config/env"

export const ttsCommands: BotCommand[] = [
  {
    data: new SlashCommandBuilder()
      .setName("tts")
      .setDescription("พูดข้อความในห้องเสียง (Text-to-Speech)")
      .addStringOption((opt) =>
        opt.setName("text").setDescription("ข้อความที่ต้องการพูด").setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("lang")
          .setDescription("ภาษา (default: th)")
          .setRequired(false)
          .addChoices(
            { name: "ไทย", value: "th" },
            { name: "English", value: "en" },
            { name: "日本語", value: "ja" },
            { name: "한국어", value: "ko" },
            { name: "中文", value: "zh-CN" },
          ),
      ),
    async execute(interaction) {
      await speak(interaction)
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("t2s")
      .setDescription("พูดข้อความในห้องเสียง (Text-to-Speech)")
      .addStringOption((opt) =>
        opt.setName("text").setDescription("ข้อความที่ต้องการพูด").setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("lang")
          .setDescription("ภาษา (default: th)")
          .setRequired(false)
          .addChoices(
            { name: "ไทย", value: "th" },
            { name: "English", value: "en" },
            { name: "日本語", value: "ja" },
            { name: "한국어", value: "ko" },
            { name: "中文", value: "zh-CN" },
          ),
      ),
    async execute(interaction) {
      await speak(interaction)
    },
  },
  {
    data: new SlashCommandBuilder().setName("tts-stop").setDescription("หยุดพูด TTS"),
    async execute(interaction) {
      await stopTts(interaction)
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("jtts")
      .setDescription("พูดด้วยเสียง AI (JaiTTS)")
      .addStringOption((opt) =>
        opt.setName("text").setDescription("ข้อความที่ต้องการพูด").setRequired(true),
      ),
    async execute(interaction) {
      if (!env.jaiTtsServiceUrl) {
        await interaction.editReply("JaiTTS is not configured (missing JAI_TTS_SERVICE_URL)")
        return
      }
      await speakJai(interaction)
    },
  },
  {
    data: new SlashCommandBuilder().setName("jtts-stop").setDescription("หยุด JaiTTS"),
    async execute(interaction) {
      await stopJaiTts(interaction)
    },
  },
]
