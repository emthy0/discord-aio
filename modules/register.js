require("dotenv")
const { SlashCommandBuilder } = require("@discordjs/builders")
const { REST } = require("@discordjs/rest")
const { Routes } = require("discord-api-types/v9")
const { downloadFromInfo } = require("ytdl-core")

const discord_token = process.env.discordToken
const discord_clientID = process.env.discordClientID
const discord_token2 = process.env.discordToken2
const discord_clientID2 = process.env.discordClientID2

const rest = new REST({ version: "9" }).setToken(discord_token)
const rest2 = new REST({ version: "9" }).setToken(discord_token2)

module.exports.defaultCommand = (guildId, globalCommands) => {
  console.log(globalCommands)
  rest
    .put(Routes.applicationCommands(discord_clientID, guildId), {
      body: globalCommands,
    })
    .then(() =>
      console.log("Successfully registered application defaultCommand.")
    )
    .catch(console.error)
}

module.exports.defaultGuildCommand = (guildId, globalCommands) => {
  // console.log(globalCommands)
  rest
    .put(Routes.applicationGuildCommands(discord_clientID, guildId), {
      body: globalCommands,
    })
    .then(() =>
      console.log("Successfully registered application defaultGuildCommand.")
    )
    .catch(console.error)
}

module.exports.updateStickerCommand = async (interaction, data) => {
  const guildId = interaction.guildId
  const guildMembers = await interaction.guild.members.fetch()
  const bot2 = guildMembers.find((m) => m.user.username === "StickerBot EXT1")
  console.log(bot2)
  if (data.length > 90 && data.length <= 190) {
    const sticker1 = data.slice(0, 90)
    const sticker2 = data.slice(90, data.length)
    this.updateStickerCommand1(guildId, sticker1)
    if (!bot2) {
      interaction.channel.send(
        "Sticker in this server is exceed the limit of 90\nPlease invite [StickerBot EXT1](https://discord.com/api/oauth2/authorize?client_id=933252983985147955&permissions=8&scope=bot%20applications.commands) for extra slots"
      )
    } else {
      this.updateStickerCommand2(guildId, sticker2)
    }
  } else {
    this.updateStickerCommand1(guildId, data)
  }
}

module.exports.updateStickerCommand1 = (guildId, data) => {
  const updatedCommands = data.map((sticker) =>
    new SlashCommandBuilder()
      .setName(sticker.stickerName)
      .setDescription(sticker.stickerDescription || "สติกเกอร์โง่ๆอันนึง")
      .addBooleanOption((option) =>
        option
          .setName("mark_as_spoiled")
          .setDescription("Should this be sensor")
          .setRequired(false)
      )
      .toJSON()
  )
  rest
    .put(Routes.applicationGuildCommands(discord_clientID, guildId), {
      body: updatedCommands,
    })
    .then(() => console.log("Successfully update application StickerCommand."))
    .catch(console.error)
}

module.exports.updateStickerCommand2 = (guildId, data) => {
  const updatedCommands = data.map((sticker) =>
    new SlashCommandBuilder()
      .setName(sticker.stickerName)
      .setDescription(sticker.stickerDescription || "สติกเกอร์โง่ๆอันนึง")
      .addBooleanOption((option) =>
        option
          .setName("mark_as_spoiled")
          .setDescription("Should this be sensor")
          .setRequired(false)
      )
      .toJSON()
  )
  rest2
    .put(Routes.applicationGuildCommands(discord_clientID2, guildId), {
      body: updatedCommands,
    })
    .then(() => console.log("Successfully update application StickerCommand."))
    .catch(console.error)
}
