const { generateDependencyReport } = require('@discordjs/voice');
const { SlashCommandBuilder } = require('@discordjs/builders');
// const config = require('./config.js')
console.log(generateDependencyReport());
const ytPlayer = require('play-dl')
const ytsearch = require('youtube-search')
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

module.exports.init = async (interaction) => {
  console.log(interaction)
  const channelID = interaction.channelId
	const guildID = interaction.guildId
  const guild = interaction.member.guild
  // musicName = interaction.options.get('name').value;
  const serverQueue = queue.get(guildID)
  var voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) return await interaction.reply('หนูไม่รู้ว่าต้องไปห้องไหน');
  const permissions = voiceChannel.permissionsFor(interaction.client.user)
  // console.log(interaction.client)
  // console.log(voiceChannel.permissionsFor(interaction.client))
  // console.log(permissions)
  if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
    return await interaction.reply('หนูไม่มีสิทธ์พูดอะ');
  }
  execute(interaction, serverQueue)
  await interaction.reply('...')
  return await interaction.deleteReply()
}

module.exports.leaveChannel = leaveChannel = async (gid) => {
  if (!gid) return;
  const connection = getVoiceConnection(gid);
  connection.destroy();
  clearTimeout(timeout[gid]);
  queue.delete(gid);
  return await endInteraction(interaction);
}

module.exports.pause = async (interaction) => {
  const guildID = interaction.guildId
  const serverQueue = queue.get(guildID)
  if (!serverQueue) return await interaction.reply('No song to pause');
  serverQueue.player.pause();
  serverQueue.playing = false;
  if (timeout[gid]) clearTimeout(timeout[gid]);
  timeout[gid] = setTimeout(() => {
    leaveChannel(gid);
  }, 10 * 60 * 1000);
  return await endInteraction(interaction);
}

module.exports.resume = async (interaction) => {
  const guildID = interaction.guildId
  const serverQueue = queue.get(guildID)
  if (timeout[gid]) clearTimeout(timeout[gid]);
  if (!serverQueue) return await interaction.reply('No song to resume');
  serverQueue.player.unpause();
  return await endInteraction(interaction);
}

module.exports.skip = async (interaction) => {
  const guildID = interaction.guildId
  const serverQueue = queue.get(guildID)
  if (!serverQueue) return await interaction.reply('No song to skip');
  serverQueue.audioQueue.shift();
  play(serverQueue)
  return await endInteraction(interaction);
}

module.exports.stop = async (interaction) => {
  const guildID = interaction.guildId
  const serverQueue = queue.get(guildID)
  if (!serverQueue) return await interaction.reply('No song to stop');
  serverQueue.audioQueue.shift();
  play(serverQueue)
  serverQueue.player.pause();
  return await endInteraction(interaction);
}


async function endInteraction(interaction) {
  await interaction.reply('...')
  return await interaction.deleteReply()
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
    songInfo = await ytPlayer.video_info(videos.results.filter(v => v.kind == 'youtube#video')[0].link);
  }
  console.log(songInfo);
  const voiceURL = songInfo.video_details.url;
  console.log(voiceURL);
  const text = {
    url: songInfo.video_details.url,
    title: songInfo.video_details.title,
    gid: interaction.guild.id,
  };
  const stream = await ytPlayer.stream(voiceURL)
  const audioResource = createAudioResource(stream.stream, {
    inputType : stream.type
  });
  console.log('adr', audioResource)
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

  console.log('Adding audio to queue.');
  serverQueue.audioQueue.push(audioResource);
  console.log('sq',serverQueue)
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
  const audioResource = serverQueue.audioQueue[0];
  const gid = serverQueue.gid;
  if (!audioResource) {
    console.log('No audio resource');
    serverQueue.playing = false;
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

