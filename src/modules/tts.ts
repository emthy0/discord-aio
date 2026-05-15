import googleTTS from "google-tts-api"
import https from "https"
import { spawn } from "child_process"
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  AudioPlayerStatus,
  StreamType,
} from "@discordjs/voice"
import type { AudioPlayer, AudioResource } from "@discordjs/voice"
import { PermissionFlagsBits } from "discord.js"
import type { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js"

interface TtsState {
  voiceChannel: VoiceBasedChannel
  player: AudioPlayer | null
  ttsQueue: string[]
  playing: boolean
}

const queue = new Map<string, TtsState>()

function fetchTTSResource(ttsUrl: string): Promise<AudioResource> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-hide_banner", "-loglevel", "error",
      "-i", "pipe:0",
      "-c:a", "libopus",
      "-f", "ogg",
      "pipe:1",
    ])

    ffmpeg.on("error", reject)
    // Suppress EPIPE when TTS is stopped mid-stream
    ffmpeg.stdin.on("error", () => {})

    https
      .get(ttsUrl, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }, (res) => {
        if (res.statusCode !== 200) {
          res.resume()
          ffmpeg.stdin.end()
          reject(new Error(`TTS fetch failed: ${res.statusCode}`))
          return
        }
        res.pipe(ffmpeg.stdin)
        res.on("error", (err) => ffmpeg.stdin.destroy(err))
        resolve(createAudioResource(ffmpeg.stdout, { inputType: StreamType.OggOpus }))
      })
      .on("error", (err) => {
        ffmpeg.stdin.destroy()
        reject(err)
      })
  })
}

export async function speak(interaction: ChatInputCommandInteraction): Promise<void> {
  const text = interaction.options.getString("text", true)
  const lang = interaction.options.getString("lang") ?? "th"

  const member = interaction.member as { voice: { channel: VoiceBasedChannel | null } } | null
  const voiceChannel = member?.voice.channel ?? null

  if (!voiceChannel) {
    await interaction.editReply("หนูไม่รู้ว่าต้องไปห้องไหน")
    return
  }

  const perms = voiceChannel.permissionsFor(interaction.client.user)
  if (!perms?.has(PermissionFlagsBits.Connect) || !perms.has(PermissionFlagsBits.Speak)) {
    await interaction.editReply("หนูไม่มีสิทธ์พูดอะ")
    return
  }

  try {
    const audioUrls = googleTTS.getAllAudioUrls(text, {
      lang,
      slow: false,
      host: "https://translate.google.com",
    })

    const guildId = interaction.guildId!
    let state = queue.get(guildId)

    if (!state) {
      state = { voiceChannel, player: null, ttsQueue: [], playing: false }
      queue.set(guildId, state)
      await constructTTSPlayer(state, guildId)
    }

    for (const audio of audioUrls) {
      state.ttsQueue.push(audio.url)
    }

    await interaction.editReply(
      `🔊 พูด: "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}"`,
    )

    if (!state.playing) {
      playNext(state, guildId)
    }
  } catch (err) {
    console.error("TTS error:", err)
    await interaction.editReply("TTS error: " + (err instanceof Error ? err.message : String(err)))
  }
}

export async function stopTts(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!
  const state = queue.get(guildId)
  if (!state) {
    await temporaryReply(interaction, "ไม่มีอะไรกำลังพูดอยู่")
    return
  }
  state.ttsQueue = []
  state.player?.stop()
  state.playing = false
  await temporaryReply(interaction, "หยุดพูดแล้ว")
}

export function leaveTts(guildId: string): void {
  const state = queue.get(guildId)
  if (state) {
    state.ttsQueue = []
    state.player?.stop()
  }
  queue.delete(guildId)
  getVoiceConnection(guildId)?.destroy()
}

async function constructTTSPlayer(state: TtsState, guildId: string): Promise<void> {
  let connection = getVoiceConnection(guildId)
  if (!connection) {
    connection = joinVoiceChannel({
      channelId: state.voiceChannel.id,
      guildId,
      adapterCreator: state.voiceChannel.guild.voiceAdapterCreator,
    })
  }
  state.player = createAudioPlayer()
  state.player.on(AudioPlayerStatus.Idle, () => playNext(state, guildId))
  state.player.on("error", (err) => {
    console.error("TTS player error:", err)
    playNext(state, guildId)
  })
  connection.subscribe(state.player)
}

function playNext(state: TtsState, guildId: string): void {
  if (!state || state.ttsQueue.length === 0) {
    if (state) state.playing = false
    return
  }
  const url = state.ttsQueue.shift()!
  state.playing = true
  fetchTTSResource(url)
    .then((resource) => state.player?.play(resource))
    .catch((err) => {
      console.error("TTS playback error:", err)
      playNext(state, guildId)
    })
}

async function temporaryReply(
  interaction: ChatInputCommandInteraction,
  text: string,
): Promise<void> {
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply(text)
  } else {
    await interaction.editReply(text)
  }
  setTimeout(() => interaction.deleteReply().catch(() => {}), 5000)
}
