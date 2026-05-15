import http from "http"
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
import { env } from "../config/env"

interface JaiTtsState {
  voiceChannel: VoiceBasedChannel
  player: AudioPlayer | null
  textQueue: string[]
  playing: boolean
}

const queue = new Map<string, JaiTtsState>()

function fetchJaiTTS(text: string): Promise<AudioResource> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-hide_banner", "-loglevel", "error",
      "-i", "pipe:0",
      "-c:a", "libopus",
      "-f", "ogg",
      "pipe:1",
    ])

    ffmpeg.on("error", reject)
    ffmpeg.stdin.on("error", () => {})

    const serviceUrl = new URL(env.jaiTtsServiceUrl!)
    const body = JSON.stringify({ text })

    const req = http.request(
      {
        hostname: serviceUrl.hostname,
        port: serviceUrl.port || 80,
        path: "/synthesize",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume()
          ffmpeg.stdin.end()
          reject(new Error(`JaiTTS service returned ${res.statusCode}`))
          return
        }
        res.pipe(ffmpeg.stdin)
        res.on("error", (err) => ffmpeg.stdin.destroy(err))
        resolve(createAudioResource(ffmpeg.stdout, { inputType: StreamType.OggOpus }))
      },
    )

    req.on("error", (err) => {
      ffmpeg.stdin.destroy()
      reject(err)
    })

    req.write(body)
    req.end()
  })
}

export async function speakJai(interaction: ChatInputCommandInteraction): Promise<void> {
  const text = interaction.options.getString("text", true)

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
    const guildId = interaction.guildId!
    let state = queue.get(guildId)

    if (!state) {
      state = { voiceChannel, player: null, textQueue: [], playing: false }
      queue.set(guildId, state)
      await constructJaiPlayer(state, guildId)
    }

    state.textQueue.push(text)

    await interaction.editReply(
      `🎙️ JaiTTS: "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}"`,
    )

    if (!state.playing) {
      playNext(state, guildId)
    }
  } catch (err) {
    console.error("JaiTTS error:", err)
    await interaction.editReply("JaiTTS error: " + (err instanceof Error ? err.message : String(err)))
  }
}

export async function stopJaiTts(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!
  const state = queue.get(guildId)
  if (!state) {
    await temporaryReply(interaction, "ไม่มีอะไรกำลังพูดอยู่")
    return
  }
  state.textQueue = []
  state.player?.stop()
  state.playing = false
  await temporaryReply(interaction, "หยุดพูดแล้ว")
}

export function leaveJaiTts(guildId: string): void {
  const state = queue.get(guildId)
  if (state) {
    state.textQueue = []
    state.player?.stop()
  }
  queue.delete(guildId)
  getVoiceConnection(guildId)?.destroy()
}

async function constructJaiPlayer(state: JaiTtsState, guildId: string): Promise<void> {
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
    console.error("JaiTTS player error:", err)
    playNext(state, guildId)
  })
  connection.subscribe(state.player)
}

function playNext(state: JaiTtsState, guildId: string): void {
  if (!state || state.textQueue.length === 0) {
    if (state) state.playing = false
    return
  }
  const text = state.textQueue.shift()!
  state.playing = true
  fetchJaiTTS(text)
    .then((resource) => state.player?.play(resource))
    .catch((err) => {
      console.error("JaiTTS playback error:", err)
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
