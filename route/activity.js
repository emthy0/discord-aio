const {
  SlashCommandBuilder,
  SlashCommandChannelOption,
} = require("@discordjs/builders")
const { createInvite } = require("../modules/activity")
module.exports = async (interaction) => {
  const { commandName, guild, options } = interaction
  console.log(interaction.options)
  const channel = options.getChannel("channel")
  const activityName = options.getString("activity")
  const inviteLink = await createInvite(guild, channel, activityName)
  return await interaction.editReply(
    `[Join ${activityName} at ${channel?.name}](${inviteLink}) `
  )
}

// const voiceChannelOption = new SlashCommandChannelOption().addChannelType()

module.exports.globalCommands = [
  new SlashCommandBuilder()
    .setName("activity")
    .setDescription("เล่นจู๋!!!!!")
    // .addChannelOption(option =>
    //   option.setName('channel')
    //     .setDescription('ช่องที่จะเล่น')
    //     .setRequired(true)
    // )
    .addChannelOption(
      new SlashCommandChannelOption()
        .addChannelType(2)
        .setName("channel")
        .setDescription("ช่องที่จะเล่น")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("activity")
        .setDescription("จะเล่นอาราย")
        .setRequired(true)
        .addChoice("Youtube_Together", "Youtube_Together")
        .addChoice("Fishington", "Fishington")
        .addChoice("Doodlecrew", "Doodlecrew")
        .addChoice("Poker night", "Poker_night")
        .addChoice("Wordsnacks", "Wordsnacks")
        .addChoice("Lettertile", "Lettertile")
        .addChoice("Betrayal", "Betrayal")
    ),
  new SlashCommandBuilder()
    .setName("summon")
    .setDescription("ทำพีธีเรียกวิญญาณ")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("ผู้ถูกเรียกวิญญาณ")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("activity").setDescription("จะเล่นอะไร").setRequired(false)
    ),
].map((command) => command.toJSON())
