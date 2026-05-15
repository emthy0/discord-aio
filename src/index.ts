import "dotenv/config"
import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
} from "discord.js"
import type { GuildMember, VoiceState } from "discord.js"
import { env } from "./config/env"
import { connectDatabase } from "./database/schema"
import { commandRegistry, isStickerCommand, handleStickerCommand } from "./commands/index"
import { checkConsoleChannel } from "./modules/music-console"
import { leaveChannel, handleQueueClear } from "./modules/music"
import { leaveTts } from "./modules/tts"
import type { BotClients } from "./types/command"

function createClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel],
  })
}

async function bootstrap(): Promise<void> {
  await connectDatabase(env.databaseSRV)

  const clients: BotClients = {
    primary: createClient(),
    secondary: createClient(),
  }

  // --- Primary client handlers ---

  clients.primary.once(Events.ClientReady, (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`)
  })

  clients.primary.on("messageCreate", async (message) => {
    if (message.author.bot) return
    if (message.content === "!setup") {
      message.reply("Use /fetch_sticker or bun src/scripts/register.ts <guildId> instead.")
    }
  })

  clients.primary.on("voiceStateUpdate", async (_old: VoiceState, newState: VoiceState) => {
    // Bot was forcefully disconnected — clear queue
    if (newState.channelId === null && newState.member?.user.id === clients.primary.user?.id) {
      await handleQueueClear(newState.guild.id).catch(console.error)
      return
    }

    if (newState.channelId === null) return

    // Auto-deafen the bot when it joins a channel
    if (newState.member?.user.id === clients.primary.user?.id) {
      if (!newState.serverDeaf) {
        newState.setDeaf(true).catch(console.error)
      }
    }

    if (newState.member?.user.bot) return

    // Leave if no non-bot members remain in the voice channel
    const voiceChannel = newState.channel
    if (voiceChannel && countHumans(voiceChannel.members) < 1) {
      await leaveChannel(newState.guild.id)
      leaveTts(newState.guild.id)
    }
  })

  clients.primary.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return

    try {
      await interaction.deferReply().catch((e) => { throw e })

      const guildID = interaction.guildId
      if (!guildID) {
        await interaction.editReply("For server only")
        return
      }

      const { commandName } = interaction

      // Ensure music console channel exists
      if (interaction.guild) {
        await checkConsoleChannel(clients.primary.user, interaction.guild).catch(console.error)
      }

      // Check if command is a dynamic sticker command
      if (await isStickerCommand(guildID, commandName)) {
        await handleStickerCommand(interaction)
        return
      }

      const command = commandRegistry.get(commandName)
      if (command) {
        await command.execute(interaction, clients)
        return
      }

      console.log(`Unknown command: ${commandName}`)
    } catch (err) {
      console.error("Interaction error:", err)
    }
  })

  // --- Secondary client handlers (sticker overflow only) ---

  clients.secondary.once(Events.ClientReady, (c) => {
    console.log(`Secondary bot ready! Logged in as ${c.user.tag}`)
  })

  clients.secondary.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return

    try {
      await interaction.deferReply()

      const guildID = interaction.guildId
      if (!guildID) {
        await interaction.editReply("For server only")
        return
      }

      const { commandName } = interaction

      if (await isStickerCommand(guildID, commandName)) {
        await handleStickerCommand(interaction)
        return
      }

      // Secondary bot also handles static sticker management commands
      const command = commandRegistry.get(commandName)
      if (command) {
        await command.execute(interaction, clients)
      }
    } catch (err) {
      console.error("Secondary interaction error:", err)
    }
  })

  // --- Login ---
  await clients.primary.login(env.discordToken)
  await clients.secondary.login(env.discordToken2)

  process.on("unhandledRejection", (error) => {
    console.error("Unhandled promise rejection:", error)
  })
}

function countHumans(members: import("discord.js").Collection<string, GuildMember>): number {
  return members.filter((m) => !m.user.bot).size
}

bootstrap().catch((err) => {
  console.error("Bootstrap failed:", err)
  process.exit(1)
})
