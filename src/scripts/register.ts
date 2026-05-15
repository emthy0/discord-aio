import "dotenv/config"
import { REST, Routes } from "discord.js"
import { env } from "../config/env"
import { allCommands } from "../commands/index"
import { getServerCache, refreshServerCache } from "../modules/stickers"
import { buildStickerCommand } from "../commands/sticker"
import { connectDatabase } from "../database/schema"

const guildIdArg = process.argv[2]
if (!guildIdArg) {
  console.error("Usage: bun src/scripts/register.ts <guildId>")
  process.exit(1)
}
const guildId: string = guildIdArg

async function main(): Promise<void> {
  await connectDatabase(env.databaseSRV)

  const rest1 = new REST().setToken(env.discordToken)
  const rest2 = new REST().setToken(env.discordToken2)

  // Register global static commands (music, tts, activity, summon, sticker management)
  const commandBodies = allCommands.map((cmd) => cmd.data.toJSON())
  await rest1.put(Routes.applicationGuildCommands(env.discordClientID, guildId), {
    body: commandBodies,
  })
  console.log(`Registered ${commandBodies.length} global commands on client 1.`)

  // Register dynamic sticker commands split between both bots
  const stickers = await refreshServerCache(guildId)
  const primary = stickers.slice(0, 90)
  const secondary = stickers.slice(90)

  await rest1.put(Routes.applicationGuildCommands(env.discordClientID, guildId), {
    body: [...commandBodies, ...primary.map(buildStickerCommand)],
  })

  if (secondary.length > 0) {
    await rest2.put(Routes.applicationGuildCommands(env.discordClientID2, guildId), {
      body: secondary.map(buildStickerCommand),
    })
    console.log(`Registered ${secondary.length} secondary sticker commands on client 2.`)
  }

  console.log(`Registered ${primary.length} primary sticker commands on client 1.`)
  console.log("Done.")
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
