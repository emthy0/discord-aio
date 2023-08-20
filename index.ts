import * as dotenv from "dotenv"
dotenv.config()

import { Client } from "discord.js"
const client = new Client({
  intents: [
    "GUILDS",
    "GUILD_MEMBERS",
    "GUILD_MESSAGES",
    "DIRECT_MESSAGES",
    "GUILD_VOICE_STATES",
  ],
  partials: ["CHANNEL"],
})
const client2 = new Client({
  intents: [
    "GUILDS",
    "GUILD_MEMBERS",
    "GUILD_MESSAGES",
    "DIRECT_MESSAGES",
    "GUILD_VOICE_STATES",
  ],
  partials: ["CHANNEL"],
})

export { client, client2 }
export default client

import mongoose from "mongoose"
mongoose.connect(process.env.databaseSRV ?? "", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
} as mongoose.ConnectOptions)

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error", err)
})
