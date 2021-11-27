require('dotenv')
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const discord_token = process.env.discordToken;
const discord_clientID = process.env.discordClientID

const rest = new REST({ version: '9' }).setToken(discord_token);

module.exports.defaultCommand = (guildId, globalCommands) => {
  console.log(globalCommands)
  rest.put(Routes.applicationCommands(discord_clientID, guildId), { body: globalCommands })
    .then(() => console.log('Successfully registered application defaultCommand.'))
    .catch(console.error);
}

module.exports.defaultGuildCommand = (guildId, globalCommands) => {
  // console.log(globalCommands)
  rest.put(Routes.applicationGuildCommands(discord_clientID, guildId), { body: globalCommands })
    .then(() => console.log('Successfully registered application defaultGuildCommand.'))
    .catch(console.error);
}

module.exports.updateStickerCommand = (guildId, data) => {
  const updatedCommands = data.map(sticker => new SlashCommandBuilder().setName(sticker.stickerName).setDescription(sticker.stickerDescription || 'สติกเกอร์โง่ๆอันนึง').toJSON())
  rest.put(Routes.applicationGuildCommands(discord_clientID, guildId), { body: updatedCommands })
    .then(() => console.log('Successfully update application StickerCommand.'))
    .catch(console.error);
}