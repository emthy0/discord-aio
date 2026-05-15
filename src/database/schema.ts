import mongoose, { Schema, Model } from "mongoose"
import type { StickerDocument } from "../types/sticker"

const stickerSchema = new Schema<StickerDocument>({
  guildID: String,
  stickerName: String,
  stickerUrl: String,
  stickerCreator: String,
  stickerDescription: String,
})

const modelCache = new Map<string, Model<StickerDocument>>()

export function getGuildModel(guildId: string): Model<StickerDocument> {
  const cached = modelCache.get(guildId)
  if (cached) return cached

  const name = `guild_${guildId}`
  const model = (mongoose.modelNames().includes(name)
    ? mongoose.model<StickerDocument>(name)
    : mongoose.model<StickerDocument>(name, stickerSchema, guildId)) as Model<StickerDocument>

  modelCache.set(guildId, model)
  return model
}

export async function connectDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri)
  console.log("MongoDB connected")
}

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err)
})
