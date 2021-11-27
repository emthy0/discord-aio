require('dotenv').config()
const { Client } = require('discord.js');
const client = new Client({ intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES", "DIRECT_MESSAGES","GUILD_VOICE_STATES"], partials: ["CHANNEL"] })

module.exports.default = client
const mongoose = require("mongoose");
const registerModule = require('./modules/register')
const router = require('./route')
// const router = {
//   music: require('./route/music'),
//   sticker: require('./route/stickers')
// }
// const stickerRoute = require('./route/stickers')
// console.log(stickerRoute)
const musicModule = require('./modules/music')
const stickersModule = require('./modules/stickers')
const globalCommands = stickersModule.globalCommands.concat(musicModule.globalCommands)


mongoose.connect(process.env.databaseSRV, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error", err);
});

client.on('messageCreate', async (message) => {
  if (message.content == '!setup') {
		// registerModule.defaultCommand(message.guildId, globalCommands.map(command => command.toJSON()))
    registerModule.defaultCommand(message.guildId, globalCommands)
		return message.reply('Setup done');
	}
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

client.on('voiceStateUpdate', async (oldVoiceState, voiceState) => {
	console.log('voiceStateUpdate', voiceState)
	if (voiceState.channelId == null) {
		return await clearQueue(voiceState.guild.id)
	}
	if (voiceState.member.user == client.user) {
    if (!voiceState.serverDeaf) {
      voiceState.setDeaf(true)
    }

  }
})

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;
	// console.log(interaction);
	const { commandName } = interaction;
	channelID = interaction.channelId
	guildID = interaction.guildId
	if (!guildID) return await interaction.reply('For server only')
	// console.log(serverSticker)
  if (commandName.includes('sticker')) {
    return await router.sticker(interaction)
  }

  if (musicModule.globalCommands.some(command => command.name == commandName)) {
    return await router.music(interaction)
  }
	
});

client.once('ready', () => {
  console.log('Ready!');
});

client.once('reconnecting', () => {
  console.log('Reconnecting!');
});

client.once('disconnect', () => {
  console.log('Disconnect!');
});

client.login(process.env.discordToken);