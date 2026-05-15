import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  AudioPlayerStatus,
  StreamType,
  type DiscordGatewayAdapterCreator,
} from "@discordjs/voice"
import { PermissionFlagsBits } from "discord.js"
import type { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js"
import type { Readable } from "stream"
import * as playdl from "play-dl"
import type { GuildMusicState, AudioEntry } from "../types/music"
import { updateQueue } from "./music-console"
import { env } from "../config/env"

const queue = new Map<string, GuildMusicState>()
const timeouts: Record<string, NodeJS.Timeout> = {}

export function currentQueue(guildId: string): GuildMusicState | undefined {
  return queue.get(guildId)
}

export async function play(interaction: ChatInputCommandInteraction): Promise<void> {
  const voiceChannel = interaction.member
    ? (interaction.member as { voice: { channel: VoiceBasedChannel | null } }).voice.channel
    : null

  if (!voiceChannel) {
    await interaction.editReply("หนูไม่รู้ว่าต้องไปห้องไหน")
    return
  }

  const perms = voiceChannel.permissionsFor(interaction.client.user)
  if (!perms?.has(PermissionFlagsBits.Connect) || !perms.has(PermissionFlagsBits.Speak)) {
    await interaction.editReply("หนูไม่มีสิทธ์พูดอะ")
    return
  }

  const songName = interaction.options.getString("song", true)
  const guildID = interaction.guildId!

  let url: string
  let title: string

  try {
    const info = await playdl.video_info(songName)
    url = info.video_details.url
    title = info.video_details.title ?? url
  } catch {
    try {
      const results = await playdl.search(songName, { source: { youtube: "video" }, limit: 5 })
      const video = results.find((r) => r.url)
      if (!video) {
        await temporaryReply(interaction, "No video found.")
        return
      }
      url = video.url
      title = video.title ?? url
    } catch (err) {
      console.error("YouTube search error:", err)
      await temporaryReply(interaction, "No video found.")
      return
    }
  }

  const stream = await createYoutubeStream(url)
  const audioEntry: AudioEntry = { url, title, resource: stream }

  let serverQueue = queue.get(guildID)
  if (!serverQueue) {
    serverQueue = {
      gid: guildID,
      voiceChannel,
      player: null,
      audioQueue: [],
      playing: false,
      idleInterval: null,
    }
    queue.set(guildID, serverQueue)
    await constructPlayer(serverQueue)
  }

  serverQueue.audioQueue.push(audioEntry)
  startPlay(serverQueue)
  await interaction.deleteReply().catch(() => {})
}

export async function pause(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildID = interaction.guildId!
  const serverQueue = queue.get(guildID)
  if (!serverQueue) { await temporaryReply(interaction, "No song playing"); return }
  serverQueue.player?.pause()
  serverQueue.playing = false
  resetIdleTimeout(guildID, 10 * 60 * 1000)
  await endInteraction(interaction)
}

export async function resume(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildID = interaction.guildId!
  const serverQueue = queue.get(guildID)
  if (!serverQueue) { await temporaryReply(interaction, "No song playing"); return }
  clearTimeout(timeouts[guildID])
  serverQueue.player?.unpause()
  await endInteraction(interaction)
}

export async function skip(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildID = interaction.guildId!
  const serverQueue = queue.get(guildID)
  if (!serverQueue || serverQueue.audioQueue.length === 0) {
    await temporaryReply(interaction, "No song to skip to")
    return
  }
  if (serverQueue.playing) serverQueue.player?.stop()
  startPlay(serverQueue)
  await endInteraction(interaction)
  await updateQueue(interaction, currentQueue(guildID)).catch(console.error)
}

export async function stop(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildID = interaction.guildId!
  const serverQueue = queue.get(guildID)
  if (!serverQueue) { await temporaryReply(interaction, "No song playing"); return }
  serverQueue.player?.stop()
  clearGuildQueue(guildID)
  resetIdleTimeout(guildID, 10 * 60 * 1000)
  await endInteraction(interaction)
  await updateQueue(interaction, currentQueue(guildID)).catch(console.error)
}

export async function leaveChannel(gid: string): Promise<void> {
  if (!gid) return
  const connection = getVoiceConnection(gid)
  connection?.destroy()
  clearTimeout(timeouts[gid])
  queue.delete(gid)
}

export function clearGuildQueue(guildID: string): void {
  const serverQueue = queue.get(guildID)
  if (serverQueue) {
    serverQueue.player?.stop()
    serverQueue.audioQueue = []
    serverQueue.playing = false
  }
}

export async function handleQueueClear(guildID: string): Promise<void> {
  const serverQueue = queue.get(guildID)
  if (serverQueue) {
    serverQueue.player?.stop()
    queue.delete(guildID)
  }
}

// --- Internal helpers ---

async function createYoutubeStream(url: string) {
  try {
    const stream = await playdl.stream(url, { quality: 2 })
    return createAudioResource(stream.stream, { inputType: stream.type as unknown as StreamType })
  } catch (err) {
    console.error("play-dl stream error, trying yt-dlp fallback:", err)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ytDlp = require("yt-dlp-exec") as (url: string, opts: Record<string, unknown>) => NodeJS.ReadableStream
      const stream = ytDlp(url, { output: "-", format: "bestaudio", quiet: true }) as Readable
      return createAudioResource(stream, { inputType: StreamType.WebmOpus })
    } catch (e) {
      throw new Error(`Failed to create audio stream: ${e}`)
    }
  }
}

async function constructPlayer(serverQueue: GuildMusicState): Promise<void> {
  let connection = getVoiceConnection(serverQueue.gid)
  if (!connection) {
    connection = joinVoiceChannel({
      channelId: serverQueue.voiceChannel.id,
      guildId: serverQueue.gid,
      adapterCreator: serverQueue.voiceChannel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
    })
  }
  serverQueue.player = createAudioPlayer()
  serverQueue.player.on(AudioPlayerStatus.Idle, () => {
    serverQueue.audioQueue.shift()
    startPlay(serverQueue)
  })
  serverQueue.player.on("error", (err) => {
    console.error("Audio player error:", err)
  })
  connection.subscribe(serverQueue.player)
}

function startPlay(serverQueue: GuildMusicState): void {
  if (!serverQueue || serverQueue.audioQueue.length === 0) {
    serverQueue.playing = false
    resetIdleTimeout(serverQueue.gid, 5 * 60 * 1000)
    return
  }

  const entry = serverQueue.audioQueue[0]
  if (!entry?.resource) {
    serverQueue.playing = false
    return
  }

  clearTimeout(timeouts[serverQueue.gid])
  serverQueue.playing = true
  serverQueue.player?.play(entry.resource)
}

function resetIdleTimeout(guildId: string, ms: number): void {
  clearTimeout(timeouts[guildId])
  timeouts[guildId] = setTimeout(() => leaveChannel(guildId), ms)
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

async function endInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.deferred) await interaction.deferReply()
  await interaction.deleteReply().catch(() => {})
}
