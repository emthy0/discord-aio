import type { Document } from "mongoose"

export interface StickerData {
  guildID: string
  stickerName: string
  stickerUrl: string
  stickerCreator: string
  stickerDescription: string
}

export interface StickerDocument extends StickerData, Document {}
