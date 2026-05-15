const googleTTS = require("google-tts-api")
const https = require("https")
const fs = require("fs")
const path = require("path")
const { execFile } = require("child_process")
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  AudioPlayerStatus,
  StreamType,  
} = require("@discordjs/voice")

const queue = new Map() // guildId -> { voiceChannel, player, ttsQueue: [], playing }

function createTTSResource(ttsUrl) {
  return new Promise((resolve, reject) => {
    https.get(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error(`Failed to fetch TTS audio: ${res.statusCode}`))
        return
      }

      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const buffer = Buffer.concat(chunks)
        const base = path.join(__dirname, 'tts_output', `tts_${Date.now()}`)
        const mp3Path = `${base}.mp3`
        const oggPath = `${base}.ogg`
        fs.mkdirSync(path.dirname(mp3Path), { recursive: true })
        fs.writeFileSync(mp3Path, buffer)
        execFile('ffmpeg', ['-i', mp3Path, '-c:a', 'libopus', '-f', 'ogg', '-y', oggPath], (err) => {
          fs.unlink(mp3Path, () => {})
          if (err) return reject(err)
          resolve(createAudioResource(fs.createReadStream(oggPath), { inputType: StreamType.OggOpus }))
        })
      })
      res.on('error', reject)
    }).on('error', reject)
  })
}

module.exports.speak = async (interaction) => {
  const text = interaction.options.getString("text")
  const lang = interaction.options.getString("lang") || "th"
  const voiceChannel = interaction.member.voice.channel

  console.log("TTS init")

  if (!voiceChannel) {
    return await interaction.editReply("หนูไม่รู้ว่าต้องไปห้องไหน")
  }

  const permissions = voiceChannel.permissionsFor(interaction.client.user)
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return await interaction.editReply("หนูไม่มีสิทธ์พูดอะ")
  }

  try {
    // google-tts-api supports up to 200 chars per request; use getAllAudioUrls for longer text
    const audioUrls = googleTTS.getAllAudioUrls(text, {
      lang: lang,
      slow: false,
      host: "https://translate.google.com",
    })

    const guildId = interaction.guildId
    let serverQueue = queue.get(guildId)

    if (!serverQueue) {
      serverQueue = {
        voiceChannel,
        player: null,
        ttsQueue: [],
        playing: false,
      }
      queue.set(guildId, serverQueue)
      await constructPlayer(serverQueue, guildId)
    }

    // Add all audio chunks to queue
    for (const audio of audioUrls) {
      console.log(audioUrls)
      serverQueue.ttsQueue.push(audio.url)
    }

    await interaction.editReply(
      `🔊 พูด: "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}"`,
    )

    if (!serverQueue.playing) {
      playNext(serverQueue, guildId)
    }
  } catch (err) {
    console.error("TTS error:", err)
    return await interaction.editReply("TTS error: " + (err instanceof Error ? err.message : String(err)))
  }
}

module.exports.stopTts = async (interaction) => {
  const guildId = interaction.guildId
  const serverQueue = queue.get(guildId)
  if (!serverQueue) {
    return await temporaryReply(interaction, "ไม่มีอะไรกำลังพูดอยู่")
  }
  serverQueue.ttsQueue = []
  if (serverQueue.player) serverQueue.player.stop()
  serverQueue.playing = false
  return await temporaryReply(interaction, "หยุดพูดแล้ว")
}

module.exports.leaveTts = async (guildId) => {
  const serverQueue = queue.get(guildId)
  if (serverQueue) {
    serverQueue.ttsQueue = []
    if (serverQueue.player) serverQueue.player.stop()
  }
  queue.delete(guildId)
  const connection = getVoiceConnection(guildId)
  if (connection) connection.destroy()
}

async function constructPlayer(serverQueue, guildId) {
  let connection = getVoiceConnection(guildId)
  if (!connection) {
    connection = joinVoiceChannel({
      channelId: serverQueue.voiceChannel.id,
      guildId: guildId,
      adapterCreator: serverQueue.voiceChannel.guild.voiceAdapterCreator,
    })
  }

  serverQueue.player = createAudioPlayer()

  serverQueue.player.on(AudioPlayerStatus.Idle, () => {
    playNext(serverQueue, guildId)
  })

  serverQueue.player.on("error", (err) => {
    console.error("TTS player error:", err)
    playNext(serverQueue, guildId)
  })

  connection.subscribe(serverQueue.player)
}

function playNext(serverQueue, guildId) {
  if (!serverQueue || serverQueue.ttsQueue.length === 0) {
    if (serverQueue) serverQueue.playing = false
    return
  }

  const url = serverQueue.ttsQueue.shift()
  serverQueue.playing = true

  createTTSResource(url)
    .then((audioResource) => {
      serverQueue.player.play(audioResource)
    })
    .catch((err) => {
      console.error("TTS playback error:", err)
      playNext(serverQueue, guildId)
    })
}

async function temporaryReply(interaction, text = "...") {
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply(text)
  } else {
    await interaction.editReply(text)
  }
  setTimeout(async () => {
    await interaction.deleteReply().catch(() => {})
  }, 5000)
}

