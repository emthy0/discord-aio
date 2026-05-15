import { SlashCommandBuilder, ChannelType } from "discord.js"
import type { VoiceBasedChannel } from "discord.js"
import type { BotCommand } from "../types/command"
import { createActivityInvite } from "../modules/activity"

export const activityCommands: BotCommand[] = [
  {
    data: new SlashCommandBuilder()
      .setName("activity")
      .setDescription("เล่นกิจกรรมใน Voice Channel")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("ช่องที่จะเล่น")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildVoice),
      )
      .addStringOption((opt) =>
        opt
          .setName("activity")
          .setDescription("จะเล่นอะไร")
          .setRequired(true)
          .addChoices(
            { name: "Youtube Together", value: "Youtube_Together" },
            { name: "Fishington", value: "Fishington" },
            { name: "Doodlecrew", value: "Doodlecrew" },
            { name: "Poker Night", value: "Poker_night" },
            { name: "Wordsnacks", value: "Wordsnacks" },
            { name: "Lettertile", value: "Lettertile" },
            { name: "Betrayal", value: "Betrayal" },
          ),
      ),
    async execute(interaction) {
      const channel = interaction.options.getChannel("channel", true) as VoiceBasedChannel
      const activityName = interaction.options.getString("activity", true)
      const guild = interaction.guild
      if (!guild) {
        await interaction.editReply("For server only")
        return
      }
      const inviteUrl = await createActivityInvite(guild, channel, activityName)
      await interaction.editReply(`[Join ${activityName} at ${channel.name}](${inviteUrl})`)
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("summon")
      .setDescription("ทำพีธีเรียกวิญญาณ")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("ผู้ถูกเรียกวิญญาณ").setRequired(true),
      )
      .addStringOption((opt) =>
        opt.setName("activity").setDescription("จะเล่นอะไร").setRequired(false),
      ),
    async execute(interaction) {
      const user = interaction.options.getUser("user", true)
      const member = interaction.guild?.members.cache.get(user.id)
      if (!member) { await interaction.editReply("No member found"); return }

      const activityStr = interaction.options.getString("activity")
      const activityPart = activityStr ? `__**${activityStr}**__` : ""
      const displayName = member.nickname ?? member.user.username

      const summonText =
        `========== บทอัญเชิญบูชา ==========\n` +
        `========== ${displayName} ==========\n` +
        `=================================\n` +
        `นะโม ตัสสะ ภะคะวะโต อะระหะโต สัมมาสัมพุทธัสสะ ${activityPart}\n`.repeat(3) +
        `มะอะอุ <@${member.id}> เมตตา จะมหาราชา สัพพะเสน่หา มะมะจิตตัง ปิยังมะมะ\n`.repeat(9) +
        "\n\n\n"

      const channel = interaction.channel
      if (channel && "send" in channel) {
        await (channel as import("discord.js").TextChannel).send(summonText).catch(console.error)
      }
      if (interaction.replied || interaction.deferred) {
        await interaction.deleteReply().catch(() => {})
      }
    },
  },
]
