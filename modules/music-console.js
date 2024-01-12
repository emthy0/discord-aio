const consoleChannelName = 'paimon-music'
const topic = '⏯ Pause/Resume the song.\n' +
  '⏹ Stop and empty the queue.\n' +
  '⏭ Skip the song.\n' +
  '🔄 Switch between the loop modes.\n' +
  '🔀 Shuffle the queue.\n'


module.exports.checkConsoleChannel = checkConsoleChannel = async (bot_user, guild) => {
  let consoleChannel = guild.channels.cache.find(c => c.name === consoleChannelName);
  if (!consoleChannel) {
    consoleChannel = await guild.channels.create(consoleChannelName, {
      type: 'GUILD_TEXT',
      topic: topic,
      position: 0,
      reason: 'AIO Paimon Console'
    }).then((c)=> c.send('Queue list:')).catch((err) => console.log(err))
  } else if (consoleChannel.topic != topic) {
    consoleChannel.setTopic(topic)
  } 
  const messageList = await consoleChannel.messages.fetch()
  const grandMessage = messageList.find(message => message.author == bot_user && message.type == 'DEFAULT')
  if (!grandMessage) {
    consoleChannel.send('Queue list:')
  }
  return {consoleChannel, grandMessage};
}

module.exports.updateQueue = async (interaction, serverQueue) => { 
  const guild = interaction.guild;
  const {consoleChannel, grandMessage }= await checkConsoleChannel(interaction.client.user, guild).catch((err) => console.log(err))
  if (!consoleChannel) return console.log('No console channel');
  var messageList = await consoleChannel.messages.fetch()
  const unwantedMessage = messageList.filter(message => {
    if (message.author != interaction.client.user) return true;
    if (message.type == 'APPLICATION_COMMAND') return true;
    return false;
  })
  
  console.log(unwantedMessage);
  await consoleChannel.bulkDelete(unwantedMessage).catch(async()=>{
    consoleChannel.delete("Clear noob's message")
    await checkConsoleChannel(interaction.client.user, guild)
  })
  // messageList = await consoleChannel.messages.fetch()
  // const grandMessage = messageList.find(message => message.author == interaction.client.user && message.type == 'DEFAULT')
  console.log('ddd',grandMessage);
  if (!serverQueue && grandMessage) {
    return grandMessage.edit('Queue list:')
  }
  const queue = serverQueue.audioQueue
  const titleList = queue.map(q => q.title)
  return await grandMessage.edit('Queue list: \n' + titleList.join('\n'))
  
}