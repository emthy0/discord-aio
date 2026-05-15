import type { Guild, VoiceBasedChannel } from "discord.js"

const APPLICATION_INDEX: Record<string, string> = {
  Youtube_Together: "755600276941176913",
  watch_together_dev: "880218832743055411",
  Fishington: "814288819477020702",
  chess_in_the_park: "832012774040141894",
  chess_in_the_park_dev: "832012586023256104",
  Betrayal: "773336526917861400",
  Doodlecrew: "878067389634314250",
  Wordsnacks: "879863976006127627",
  Lettertile: "879863686565621790",
  Poker_night: "755827207812677713",
}

export async function createActivityInvite(
  guild: Guild,
  channel: VoiceBasedChannel,
  activityName: string,
): Promise<string> {
  const activityID = APPLICATION_INDEX[activityName]
  if (!activityID) throw new Error(`Unknown activity: ${activityName}`)

  const invite = await guild.invites.create(channel, {
    maxAge: 0,
    targetType: 2,
    targetApplication: activityID,
  })
  return invite.url
}
