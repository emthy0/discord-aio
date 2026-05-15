import { PermissionFlagsBits } from "discord.js"
import type { GuildMember } from "discord.js"
import { getGuildModel } from "../database/schema"
import type { StickerData } from "../types/sticker"

const serverCache = new Map<string, StickerData[]>()
const tokenCache = new Map<string, string>()

export function checkPermissions(member: GuildMember): boolean {
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.user.id === "603763595754471425"
  )
}

export function toSnakeCase(str: string): string {
  const matches = str.match(
    /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g,
  )
  if (!matches) return str
  return matches.map((x) => x.toLowerCase()).join("_")
}

export async function getServerCache(guildID: string): Promise<StickerData[]> {
  const cached = serverCache.get(guildID)
  if (cached) return cached
  return refreshServerCache(guildID)
}

export async function refreshServerCache(guildID: string): Promise<StickerData[]> {
  const model = getGuildModel(guildID)
  const stickers = await model.find().lean()
  serverCache.set(guildID, stickers as StickerData[])
  return stickers as StickerData[]
}

export async function addSticker(
  guildID: string,
  data: Omit<StickerData, "guildID">,
): Promise<StickerData> {
  const model = getGuildModel(guildID)
  const doc = new model({ ...data, guildID })
  await doc.save()
  await refreshServerCache(guildID)
  return doc.toObject() as StickerData
}

export async function editStickerDescription(
  guildID: string,
  stickerName: string,
  description: string,
): Promise<void> {
  const model = getGuildModel(guildID)
  await model.findOneAndUpdate({ stickerName }, { $set: { stickerDescription: description } })
  await refreshServerCache(guildID)
}

export async function deleteSticker(guildID: string, stickerName: string): Promise<void> {
  const model = getGuildModel(guildID)
  await model.findOneAndDelete({ stickerName })
  await refreshServerCache(guildID)
}

export function generateGalleryToken(guildID: string): string {
  const token =
    Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
  tokenCache.set(guildID, token)
  return token
}
