const { init, pause, resume, skip, stop, leaveChannel } = require('../modules/music')

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
      return await leaveChannel(interaction.guildId)
    default:
      await interaction.reply('ยังไม่ได้ทำ')
      return setTimeout(async () => { await interaction.deleteReply()},5000)
  }
  
}

module.exports.clearQueue = { clearQueue } = require('../modules/music')