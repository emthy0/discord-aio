import type { AudioPlayer, VoiceConnection } from "@discordjs/voice"
import type { VoiceBasedChannel } from "discord.js"

export interface Track {
  title: string
  url: string
  requestedBy: string
}

export interface AudioEntry {
  title: string
  url: string
  resource: import("@discordjs/voice").AudioResource
}

export interface GuildMusicState {
  gid: string
  voiceChannel: VoiceBasedChannel
  player: AudioPlayer | null
  audioQueue: AudioEntry[]
  playing: boolean
  idleInterval: NodeJS.Timeout | null
}
