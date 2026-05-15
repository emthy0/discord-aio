import googleTTS from "google-tts-api"
import https from "https"
import fs from "fs"
import path from "path"
import { execFile } from "child_process"
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  AudioPlayerStatus,
  StreamType,
  type DiscordGatewayAdapterCreator,
} from "@discordjs/voice"
import type { AudioPlayer } from "@discordjs/voice"
import { PermissionFlagsBits } from "discord.js"
import type { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js"

interface TtsState {
  voiceChannel: VoiceBasedChannel
  player: AudioPlayer | null
  ttsQueue: string[]
  playing: boolean
}

const queue = new Map<string, TtsState>()
const OUTPUT_DIR = path.join(__dirname, "../../modules/tts_output")

function ensureOutputDir(): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

function fetchTTSResource(ttsUrl: string): Promise<import("@discordjs/voice").AudioResource> {
  return new Promise((resolve, reject) => {
    https
      .get(
        ttsUrl,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume()
            reject(new Error(`TTS fetch failed: ${res.statusCode}`))
            return
          }
          const chunks: Buffer[] = []
          res.on("data", (chunk: Buffer) => chunks.push(chunk))
          res.on("end", () => {
            ensureOutputDir()
            const base = path.join(OUTPUT_DIR, `tts_${Date.now()}`)
            const mp3Path = `${base}.mp3`
            const oggPath = `${base}.ogg`
            fs.writeFileSync(mp3Path, Buffer.concat(chunks))
            execFile(
              "ffmpeg",
              ["-i", mp3Path, "-c:a", "libopus", "-f", "ogg", "-y", oggPath],
              (err) => {
                fs.unlink(mp3Path, () => {})
                if (err) { reject(err); return }
                resolve(
                  createAudioResource(fs.createReadStream(oggPath), {
                    inputType: StreamType.OggOpus,
                  }),
                )
              },
            )
          })
          res.on("error", reject)
        },
      )
      .on("error", reject)
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
      adapterCreator: state.voiceChannel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
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
