const { init, pause, resume, skip, stop, leaveChannel, clearQueue } = require('../modules/music')

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
    default:
      await interaction.editReply('ยังไม่ได้ทำ')
      return setTimeout(async () => { await interaction.deleteReply()},5000)
  }
  
}

module.exports.clearQueue = clearQueue
module.exports.leaveChannel = leaveChannel