const consoleChannelName = 'paimon-music'
const topic = '⏯ Pause/Resume the song.\n' +
  '⏹ Stop and empty the queue.\n' +
  '⏭ Skip the song.\n' +
  '🔄 Switch between the loop modes.\n' +
  '🔀 Shuffle the queue.\n'


module.exports.checkConsoleChannel = checkConsoleChannel = async (guild) => {
  let consoleChannel = guild.channels.cache.find(c => c.name === consoleChannelName);
  if (!consoleChannel) {
    consoleChannel = await guild.channels.create(consoleChannelName, {
      type: 'GUILD_TEXT',
      topic: topic,
      position: 0,
      reason: 'AIO Paimon Console'
    }).then((c)=> c.send('Queue list:')).catch((err) => console.log(err))
  }
  return consoleChannel;
}

module.exports.updateQueue = async (interaction, serverQueue) => { 
  const guild = interaction.guild;
  const consoleChannel = await checkConsoleChannel(guild)
  const messageList = await consoleChannel.messages.fetch()
  const unwantedMessage = messageList.filter(message => {
    if (message.author != interaction.client.user) return true;
    if (message.type == 'APPLICATION_COMMAND') return true;
    return false;
  })
  const grandMessage = messageList.find(message => message.author == interaction.client.user && message.type == 'DEFAULT')
  console.log(unwantedMessage);
  await consoleChannel.bulkDelete(unwantedMessage)
  console.log('ddd',grandMessage);
  if (!serverQueue) {
    return grandMessage.edit('Queue list:')
  }
  const queue = serverQueue.audioQueue
  const titleList = queue.map(q => q.title)
  return await grandMessage.edit('Queue list: \n' + titleList.join('\n'))
  
}