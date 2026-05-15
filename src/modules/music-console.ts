import { ChannelType } from "discord.js"
import type { Client, Guild, GuildTextBasedChannel, Message } from "discord.js"
import type { GuildMusicState } from "../types/music"

const CONSOLE_CHANNEL_NAME = "paimon-music"
const CHANNEL_TOPIC =
  "⏯ Pause/Resume the song.\n" +
  "⏹ Stop and empty the queue.\n" +
  "⏭ Skip the song.\n" +
  "🔄 Switch between the loop modes.\n" +
  "🔀 Shuffle the queue.\n"

async function findOrCreateConsoleChannel(
  botUser: Client["user"],
  guild: Guild,
): Promise<{ channel: GuildTextBasedChannel; headerMessage: Message | null }> {
  let channel = guild.channels.cache.find(
    (c) => c.name === CONSOLE_CHANNEL_NAME && c.type === ChannelType.GuildText,
  ) as GuildTextBasedChannel | undefined

  if (!channel) {
    channel = (await guild.channels.create({
      name: CONSOLE_CHANNEL_NAME,
      type: ChannelType.GuildText,
      topic: CHANNEL_TOPIC,
      reason: "AIO Paimon Console",
    })) as GuildTextBasedChannel
    await channel.send("Queue list:")
  } else if ((channel as unknown as { topic: string | null }).topic !== CHANNEL_TOPIC) {
    await (channel as unknown as { setTopic: (t: string) => Promise<void> }).setTopic(CHANNEL_TOPIC)
  }

  const messages = await channel.messages.fetch()
  const headerMessage =
    messages.find(
      (m) => m.author.id === botUser?.id && m.type === 0,
    ) ?? null

  if (!headerMessage) {
    await channel.send("Queue list:")
  }

  return { channel, headerMessage }
}

export async function checkConsoleChannel(
  botUser: Client["user"],
  guild: Guild,
): Promise<{ channel: GuildTextBasedChannel; headerMessage: Message | null }> {
  return findOrCreateConsoleChannel(botUser, guild)
}

export async function updateQueue(
  interaction: { client: Client; guild: Guild | null },
  serverQueue: GuildMusicState | undefined,
): Promise<void> {
  const guild = interaction.guild
  if (!guild) return

  const result = await findOrCreateConsoleChannel(interaction.client.user, guild).catch(
    (err) => { console.error("Console channel error:", err); return null },
  )
  if (!result) return

  const { channel, headerMessage } = result

  const messages = await channel.messages.fetch()
  const unwanted = messages.filter((m) => {
    if (m.author.id !== interaction.client.user?.id) return true
    if (m.type === 20) return true // APPLICATION_COMMAND type
    return false
  })

  await channel.bulkDelete(unwanted).catch(async () => {
    await channel.delete("Clear messages").catch(() => {})
    await findOrCreateConsoleChannel(interaction.client.user, guild).catch(() => {})
  })

  if (!serverQueue || serverQueue.audioQueue.length === 0) {
    await headerMessage?.edit("Queue list:").catch(() => {})
    return
  }

  const titleList = serverQueue.audioQueue.map((q) => q.title)
  await headerMessage?.edit("Queue list:\n" + titleList.join("\n")).catch(() => {})
}
