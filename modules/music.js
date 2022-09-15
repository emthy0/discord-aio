const { generateDependencyReport } = require('@discordjs/voice');
// const { SlashCommandBuilder } = require('@discordjs/builders');
// const config = require('./config.js')
console.log(generateDependencyReport());
// const ytdl = require('ytdl-core');
const ytPlayer = require('play-dl')
const ytsearch = require('youtube-search')
const { updateQueue } = require('./music-console')
const {
  joinVoiceChannel,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
} = require('@discordjs/voice');
const { Client, Intents } = require('discord.js');
// const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] })
const client = new Client({ intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES", "DIRECT_MESSAGES","GUILD_VOICE_STATES"], partials: ["CHANNEL"] })
const queue = new Map();
const timeout = {};
// client.once('ready', () => {
//   console.log('Ready!');
// });

// client.once('reconnecting', () => {
//   console.log('Reconnecting!');
// });

// client.once('disconnect', () => {
//   console.log('Disconnect!');
// });

// client.on('messageCreate', async (message)=> {
//   if (message.author.bot) return;
//   const serverQueue = queue.get(message.guild.id);
//   if (message.content === 'leave') return leaveChannel(message.guild.id);
//   var voiceChannel = message.member.voice.channel;
//   if (!voiceChannel) return message.reply('หนูไม่รู้ว่าต้องไปห้องไหน');
//   const permissions = voiceChannel.permissionsFor(message.client.user);
//   if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
//     return message.channel.send('หนูไม่มีสิทธ์พูดอะ');
//   }
// })

module.exports.currentQueue = currentQueue = (guildId) => queue.get(guildId);

module.exports.init = async (interaction) => {
  console.log(interaction)
  const channelID = interaction.channelId
	const guildID = interaction.guildId
  const guild = interaction.member.guild
  // musicName = interaction.options.get('name').value;
  const serverQueue = queue.get(guildID)
  var voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) return await interaction.editReply('หนูไม่รู้ว่าต้องไปห้องไหน');
  const permissions = voiceChannel.permissionsFor(interaction.client.user)
  // console.log(interaction.client)
  // console.log(voiceChannel.permissionsFor(interaction.client))
  // console.log(permissions)
  if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
    return await interaction.editReply('หนูไม่มีสิทธ์พูดอะ');
  }
  execute(interaction, serverQueue)
  // await interaction.editReply('...')
  return await interaction.deleteReply()
}

module.exports.leaveChannel = leaveChannel = async (gid) => {
  if (!gid) return;
  const connection = getVoiceConnection(gid);
  if (!connection) return
  connection.destroy();
  clearTimeout(timeout[gid]);
  queue.delete(gid);
  return
}
module.exports.pause = async (interaction) => {
  const guildID = interaction.guildId
  const serverQueue = queue.get(guildID)
  if (!serverQueue) return await temporaryReply(interaction, 'No song playing');
  serverQueue.player.pause();
  serverQueue.playing = false;
  if (timeout[guildID]) clearTimeout(timeout[guildID]);
  timeout[guildID] = setTimeout(() => {
    leaveChannel(guildID);
  }, 10 * 60 * 1000);
  return await endInteraction(interaction);
}

module.exports.resume = async (interaction) => {
  const guildID = interaction.guildId
  const serverQueue = queue.get(guildID)
  if (timeout[guildID]) clearTimeout(timeout[guildID]);
  if (!serverQueue) return await temporaryReply(interaction, 'No song playing');
  serverQueue.player.unpause();
  return await endInteraction(interaction);
}

module.exports.skip = async (interaction) => {
  const guildID = interaction.guildId
  const serverQueue = queue.get(guildID)
  if (!serverQueue) return await temporaryReply(interaction, 'No song to skip to');
  if (serverQueue.playing) serverQueue.player.stop()
  // serverQueue.audioQueue.shift();
  if (serverQueue.audioQueue.length === 0) return await temporaryReply(interaction, 'No song to skip to');
  play(serverQueue)
  await endInteraction(interaction);
  return await updateQueue(interaction, currentQueue(interaction.guildId)).catch((err) => console.log(err))
}

module.exports.stop = async (interaction) => {
  const guildID = interaction.guildId
  const serverQueue = queue.get(guildID)
  if (!serverQueue) return await temporaryReply(interaction, 'No song playing');
  if (serverQueue.player) serverQueue.player.stop()
  // serverQueue.audioQueue.shift();
  // play(serverQueue)
  // serverQueue.player.pause();
  await clearQueue(guildID)
  if (timeout[guildID]) clearTimeout(timeout[guildID]);
  timeout[guildID] = setTimeout(() => {
    leaveChannel(guildID);
  }, 10 * 60 * 1000);
  await endInteraction(interaction);
  return await updateQueue(interaction, currentQueue(interaction.guildId)).catch((err) => console.log(err))
}

module.exports.clearQueue = clearQueue = async (guildID) => {
  console.log('Clearing queue for ' + guildID);
  const serverQueue = queue.get(guildID)
  await updateQueue(serverQueue.voiceChannel, serverQueue)
  if (serverQueue) {
    if (serverQueue.player) {
      serverQueue.player.stop();
    }
    queue.delete(guildID);   
  }
}

async function temporaryReply(interaction, text='...') {
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply(text)
  } else interaction.editReply(text)
  setTimeout(async () => { await interaction.deleteReply().catch(() => {});},5000)
}

async function endInteraction(interaction) {
  console.log('fdf',interaction.deferred)
  if (!interaction.deferred) {
    await interaction.deferReply()
    
  }
  return await interaction.deleteReply().catch(() => {});
}

async function execute(interaction, serverQueue) {
  const songName = interaction.options.get('song').value;
  const voiceChannel = interaction.member.voice.channel;
  const guildID = interaction.guildId
  let songInfo = {}
  try {
    songInfo = await ytPlayer.video_info(songName);
  } catch (err) {
    const videos = await ytsearch(songName, {
      maxResults: 10,
      key: process.env.youtubeApiKey
    })
    // console.log('Song',videos.results.filter(v => v.kind == 'youtube#video'))
    const vdoResult = videos.results.filter(v => v.kind == 'youtube#video')
    if (vdoResult.length == 0) {
      await temporaryReply(interaction, 'No video found.')
      return
    }
    songInfo = await ytPlayer.video_info(vdoResult[0].link);
  }
  // console.log(songInfo);
  const voiceURL = songInfo.video_details.url;
  console.log(voiceURL);
  const text = {
    url: songInfo.video_details.url,
    title: songInfo.video_details.title,
    gid: interaction.guild.id,
  };
  const stream = await ytPlayer.stream(voiceURL, {
    quality: 2
  })
  // const stream = await ytdl(voiceURL);
  // console.log('ytdl', stream);

  // const audioResource = createAudioResource(stream);
  const audioResource = createAudioResource(stream.stream, {
    inputType : stream.type
  });
  // console.log('adr', audioResource)
  if (!serverQueue) {
    const queueContruct = {
      gid: guildID,
      voiceChannel: voiceChannel,
      player: null,
      audioQueue: [],
      volume: 5,
      idleInterval: null,
      playing: false,
    };

    // queueContruct.audioQueue.push(audioResource);
    queue.set(guildID, queueContruct);
    serverQueue = queue.get(guildID);
    console.log('Created new Server queue.');
    await constuctPlayer(serverQueue);
  }
  audioData = {
    url: songInfo.video_details.url,
    title: songInfo.video_details.title,
    resource: audioResource,
  }
  console.log('Adding audio to queue.');
  serverQueue.audioQueue.push(audioData);
  // console.log('sq',serverQueue)
  play(serverQueue);
}


async function constuctPlayer(serverQueue) {
  console.log('Constucting player.');
  const gid = serverQueue.gid;
  let connection = getVoiceConnection(gid);
  if (!connection)
    connection = await joinVoiceChannel({
      channelId: serverQueue.voiceChannel.id,
      guildId: gid,
      adapterCreator: serverQueue.voiceChannel.guild.voiceAdapterCreator,
    });
  serverQueue.player = createAudioPlayer();
  serverQueue.player.on('idle', () => {
    serverQueue.audioQueue.shift();
    play(serverQueue);
  });
  connection.subscribe(serverQueue.player);
}

async function play(serverQueue) {
  if (!serverQueue) return;
  console.log('Getting audio');
  const audioResource = serverQueue.audioQueue[0].resource;
  const gid = serverQueue.gid;
  await updateQueue(serverQueue.voiceChannel, currentQueue(gid)).catch((err) => console.log(err))
  if (!audioResource) {
    console.log('No audio resource');
    serverQueue.playing = false;
    serverQueue.player.stop()
    timeout[gid] = setTimeout(() => {
      leaveChannel(gid);
    }, 5 * 60 * 1000);
    queue.delete(gid);
    return;
  }
  if (timeout[gid]) clearTimeout(timeout[gid]);
  console.log('Starting audio');
  serverQueue.playing = true;
  serverQueue.player.play(audioResource, {
    inputType: StreamType.OggOpus,
  });
}

function membersCount(members) {
  const nobot = members.filter(m => !m.user.bot)
  return nobot.size
}

// module.exports.globalCommands = [
// 	new SlashCommandBuilder().setName('play').setDescription('เล่นเพลง')
//     .addStringOption(option =>
//       option.setName('song')
//         .setDescription('ชื่อเพลง / ลิงก์')
//         .setRequired(true)
//       ),
//   new SlashCommandBuilder().setName('unqueue').setDescription('ลบเพลงออกจากคิว')
//     .addStringOption(option =>
//       option.setName('id')
//         .setDescription('id ของเพลงที่จะลบ')
//         .setRequired(true)
//       ),
//   new SlashCommandBuilder().setName('queue').setDescription('แสดงคิวเพลง'),
// 	new SlashCommandBuilder().setName('pause').setDescription('หยุดเพลง'),
//   new SlashCommandBuilder().setName('resume').setDescription('เล่นเพลงต่อ'),
//   new SlashCommandBuilder().setName('stop').setDescription('หยุดเพลงและลบเพลงปัจจุบันออกจากคิว'),
//   new SlashCommandBuilder().setName('leave').setDescription('ออกจากห้อง'),
//   new SlashCommandBuilder().setName('skip').setDescription('ไปเพลงต่อไป'),
//   new SlashCommandBuilder().setName('clear').setDescription('เคลียคิว'),
// ].map(command => command.toJSON())

