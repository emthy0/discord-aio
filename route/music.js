const { SlashCommandBuilder } = require('@discordjs/builders');
const { init, pause, resume, skip, stop, leaveChannel, clearQueue, currentQueue } = require('../modules/music')
const { updateQueue } = require('../modules/music-console')
module.exports = async (interaction) => {
  const { commandName } = interaction;
  switch (commandName) {
    case 'play':
      return await init(interaction)
    case 'pause':
      return await pause(interaction)
    case 'resume':
      return await resume(interaction)
    case 'skip':
      return await skip(interaction)
    case 'stop':
      return await stop(interaction)
    case 'leave':
      await leaveChannel(interaction.guildId)
      return await interaction.deleteReply()
    case 'queue':
      // console.log(currentQueue(interaction.guildId))
      return await updateQueue(interaction, currentQueue(interaction.guildId))
    default:
      await interaction.editReply('ยังไม่ได้ทำ')
      return setTimeout(async () => { await interaction.deleteReply()},5000)
  }
  
}

module.exports.clearQueue = clearQueue
module.exports.leaveChannel = leaveChannel

module.exports.globalCommands = [
	new SlashCommandBuilder().setName('play').setDescription('เล่นเพลง')
    .addStringOption(option =>
      option.setName('song')
        .setDescription('ชื่อเพลง / ลิงก์')
        .setRequired(true)
      ),
  new SlashCommandBuilder().setName('unqueue').setDescription('ลบเพลงออกจากคิว')
    .addStringOption(option =>
      option.setName('id')
        .setDescription('id ของเพลงที่จะลบ')
        .setRequired(true)
      ),
  new SlashCommandBuilder().setName('queue').setDescription('แสดงคิวเพลง'),
	new SlashCommandBuilder().setName('pause').setDescription('หยุดเพลง'),
  new SlashCommandBuilder().setName('resume').setDescription('เล่นเพลงต่อ'),
  new SlashCommandBuilder().setName('stop').setDescription('หยุดเพลงและลบเพลงปัจจุบันออกจากคิว'),
  new SlashCommandBuilder().setName('leave').setDescription('ออกจากห้อง'),
  new SlashCommandBuilder().setName('skip').setDescription('ไปเพลงต่อไป'),
  new SlashCommandBuilder().setName('clear').setDescription('เคลียคิว'),
].map(command => command.toJSON())
