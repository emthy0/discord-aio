import type { BotCommand } from "../types/command"
import { musicCommands } from "./music"
import { ttsCommands } from "./tts"
import { activityCommands } from "./activity"
import { staticStickerCommands } from "./sticker"

export const allCommands: BotCommand[] = [
  ...musicCommands,
  ...ttsCommands,
  ...activityCommands,
  ...staticStickerCommands,
]

export const commandRegistry = new Map<string, BotCommand>(
  allCommands.map((cmd) => [cmd.data.name, cmd]),
)

export { staticStickerCommands, buildStickerCommand, isStickerCommand, handleStickerCommand } from "./sticker"
