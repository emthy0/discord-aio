// require('dotenv').config({path:'./.env.dev'})
require("dotenv").config()
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Partials,
} = require("discord.js")
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
})
const client2 = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
})
module.exports.default = client
const mongoose = require("mongoose")
const registerModule = require("./modules/register")
const router = require("./route")
// const router = {
//   music: require('./route/music'),
//   sticker: require('./route/stickers')
// }
// const stickerRoute = require('./route/stickers')
// console.log(stickerRoute)
const musicModule = require("./modules/music")
const musicConsoleModule = require("./modules/music-console")
const stickersModule = require("./modules/stickers")
const command = require("nodemon/lib/config/command")
// const activityRoute = require('./route/activity')
const globalCommands = router.sticker.globalCommands
  .concat(router.music.globalCommands)
  .concat(router.activity.globalCommands)
  .concat(router.tts.globalCommands)

mongoose.connect(process.env.databaseSRV, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
})

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error", err)
})

client.on("messageCreate", async (message) => {
  if (message.author.bot) return
  if (message.content == "!setup") {
    // registerModule.defaultCommand(message.guildId, globalCommands.map(command => command.toJSON()))
    registerModule.defaultCommand(message.guildId, globalCommands)
    message.reply("Setup done")
    return
  }
  // message["consoleChannel"] = await musicConsoleModule
  //   .checkConsoleChannel(message.guild)
  //   .catch((err) => console.log(err))
  // if (message.channelId == message["consoleChannel"].id) {
  //   // song request!!!
  // }

  // if (message.content == '!fetch') {
  // 	let serverData = serverDB.get(message.guildId)
  // 	if (!serverData) {
  // 		serverData =  await newServerStickerDB(message.guildId)
  // 	}
  // 	serverSticker = serverData.data
  // 	registerModule.updateStickerCommand(message.guildId, serverSticker)
  // 	return message.reply('Setup done');
  // }
})

client.on("voiceStateUpdate", async (_, voiceState) => {
  // console.log('voiceStateUpdate', voiceState)
  if (voiceState.channelId == null && voiceState.member.user == client.user) {
    return await router.music
      .clearQueue(voiceState.guild.id)
      .catch((err) => console.log(err))
  }

  if (voiceState.channelId == null) return

  if (voiceState.member.user == client.user) {
    if (!voiceState.serverDeaf) {
      voiceState.setDeaf(true).catch((err) => console.log(err))
    }
  }

  if (voiceState.member.user.bot) return

  const voiceChannel = voiceState.channel
  if (membersCount(voiceChannel.members) < 1) {
    return router.music.leaveChannel(voiceState.guild.id)
  }
})

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // await interaction.deferReply().catch(console.error)

    if (!interaction.isCommand() || !interaction.isChatInputCommand()) return
    // interaction.deferReply()
    await interaction.deferReply().catch((e) => {
      console.error(e)
      console.log("OH timeout")
      throw e
    })
    // interaction.deferReply().catch(e=>{})
    // console.log(interaction);
    const { commandName } = interaction
    const channelID = interaction.channelId
    const guildID = interaction.guildId
    // if (!guildID) return await interaction.reply("For server only")
    console.log(commandName)

    interaction["consoleChannel"] = await musicConsoleModule
      .checkConsoleChannel(client.user, interaction.guild)
      .catch((err) => console.log(err))
    console.log(interaction.options)
    if (
      (await router.sticker.isSticker(guildID, commandName)) ||
      router.sticker.globalCommands.some(
        (command) => command.name == commandName,
      )
    ) {
      return await router.sticker(interaction)
    }

    if (
      router.music.globalCommands.some((command) => command.name == commandName)
    ) {
      return await router.music(interaction)
    }

    if (commandName == "activity") {
      router.activity(interaction)
    }

    if (
      router.tts.globalCommands.some((command) => command.name == commandName)
    ) {
      return await router.tts(interaction)
    }

    if (commandName == "summon") {
      const user = interaction.options.getUser("user")
      if (!user) return await interaction.editReply("No user found")
      const member = interaction.guild.members.cache.get(user.id)
      if (!member) return await interaction.editReply("No member found")
      const channel = interaction.channel
      if (!channel) return await interaction.editReply("No channel found")
      const summonString =
        `========== บทอัญเชิญบูชา ==========\n` +
        `========== ${member.nickname} ==========\n` +
        `=================================\n` +
        `นะโม ตัสสะ ภะคะวะโต อะระหะโต สัมมาสัมพุทธัสสะ ${interaction.options.getString("activity")
          ? "__**" + interaction.options.getString("activity") + "**__"
          : ""
          }\n`.repeat(3) +
        `มะอะอุ <@${member.id}> เมตตา จะมหาราชา สัพพะเสน่หา มะมะจิตตัง ปิยังมะมะ\n`.repeat(
          9,
        ) +
        "\n\n\n"
      // const summonString = `⣿⣿⣿⣿⣿⠟⠋⠄⠄⠄⠄⠄⠄⠄⢁⠈⢻⢿⣿⣿⣿⣿⣿⣿⣿
      // ⣿⣿⣿⣿⣿⠃⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⠈⡀⠭⢿⣿⣿⣿⣿
      // ⣿⣿⣿⣿⡟⠄⢀⣾⣿⣿⣿⣷⣶⣿⣷⣶⣶⡆⠄⠄⠄⣿⣿⣿⣿
      // ⣿⣿⣿⣿⡇⢀⣼⣿<@${member.id}>⣿⣧⠄⠄⢸⣿⣿⣿⣿
      // ⣿⣿⣿⣿⣇⣼⣿⣿⠿⠶⠙⣿⡟⠡⣴⣿⣽⣿⣧⠄⢸⣿⣿⣿⣿
      // ⣿⣿⣿⣿⣿⣾⣿⣿⣟⣭⣾⣿⣷⣶⣶⣴⣶⣿⣿⢄⣿⣿⣿⣿⣿
      // ⣿⣿⣿⣿⣿⣿⣿⣿⡟⣩⣿⣿⣿⡏⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
      // ⣿⣿⣿⣿⣿⣿⣹⡋⠘⠷⣦⣀⣠⡶⠁⠈⠁⠄⣿⣿⣿⣿⣿⣿⣿
      // ⣿⣿⣿⣿⣿⣿⣍⠃⣴⣶⡔⠒⠄⣠⢀⠄⠄⠄⡨⣿⣿⣿⣿⣿⣿
      // ⣿⣿⣿⣿⣿⣿⣿⣦⡘⠿⣷⣿⠿⠟⠃⠄⠄⣠⡇⠈⠻⣿⣿⣿⣿
      // ⣿⣿⣿⣿⡿⠟⠋⢁⣷⣠⠄⠄⠄⠄⣀⣠⣾⡟⠄⠄⠄⠄⠉⠙⠻
      // ⡿⠟⠋⠁⠄⠄⠄⢸⣿⣿⡯⢓⣴⣾⣿⣿⡟⠄⠄⠄⠄⠄⠄⠄⠄
      // ⠄⠄⠄⠄⠄⠄⠄⣿⡟⣷⠄⠹⣿⣿⣿⡿⠁⠄⠄⠄⠄⠄⠄⠄⠄
      // ⠄⠄⠄⠄⠄⠄⣸⣿⡷⡇⠄⣴⣾⣿⣿⠃⠄⠄⠄⠄⠄⠄⠄⠄⠄
      // ⠄⠄⠄⠄⠄⠄⣿⣿⠃⣦⣄⣿⣿⣿⠇⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄
      // ⠄⠄⠄⠄⠄⢸⣿⠗⢈⡶⣷⣿⣿⡏⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄`
      channel.send(summonString).catch((err) => console.log(err))
      if (interaction.replied) interaction.deleteReply()
    }
  } catch (err) {

    console.error(err)
    console.log("Oh fuck")
  }
})

client2.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return
  // console.log(interaction);
  const { commandName } = interaction
  const channelID = interaction.channelId
  const guildID = interaction.guildId
  await interaction.deferReply()
  if (!guildID) return await interaction.editReply("For server only")
  console.log(commandName)

  if (
    (await router.sticker.isSticker(guildID, commandName)) ||
    router.sticker.globalCommands.some((command) => command.name == commandName)
  ) {
    return await router.sticker(interaction)
  }
})

function membersCount(members) {
  const nobot = members.filter((m) => !m.user.bot)
  return nobot.size
}

client.once("ready", () => {
  console.log("Ready!")
})

client2.once("ready", () => {
  console.log("Ready2!")
})

client.once("reconnecting", () => {
  console.log("Reconnecting!")
})

client.once("disconnect", () => {
  console.log("Disconnect!")
})

client.login(process.env.discordToken)
client2.login(process.env.discordToken2)

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error)
})
