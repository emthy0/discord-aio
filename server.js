const { AutoRouter } = require("itty-router")
require("dotenv").config()
const {
  InteractionResponseType,
  InteractionType,
  verifyKey,
  InteractionResponseFlags,
} = require("discord-interactions")
const router = require("./route")
const mongoose = require("mongoose")
const registerModule = require("./modules/register")
const musicConsoleModule = require("./modules/music-console")
const globalCommands = router.sticker.globalCommands
  .concat(router.music.globalCommands)
  .concat(router.activity.globalCommands)

mongoose.connect(process.env.databaseSRV, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error", err)
})

class JsonResponse extends Response {
  constructor(body, init) {
    const jsonBody = JSON.stringify(body)
    init = init || {
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
    }
    super(jsonBody, init)
  }
}

const webRouter = AutoRouter()

/**
 * A simple :wave: hello page to verify the worker is working.
 */
webRouter.get("/", (request, env) => {
  return new Response(`👋 ${process.env.discordClientID}`)
})

/**
 * Main route for all requests sent from Discord.  All incoming messages will
 * include a JSON payload described here:
 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
 */
webRouter.post("/", async (request, env) => {
  const { isValid, interaction } = await server.verifyDiscordRequest(
    request,
    env
  )
  if (!isValid || !interaction) {
    return new Response("Bad request signature.", { status: 401 })
  }

  if (interaction.type === InteractionType.PING) {
    // The `PING` message is used during the initial webhook handshake, and is
    // required to configure the webhook in the developer portal.
    return new JsonResponse({
      type: InteractionResponseType.PONG,
    })
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    // Most user commands will come as `APPLICATION_COMMAND`.
    const { commandName } = interaction
    channelID = interaction.channelId
    guildID = interaction.guildId
    if (!guildID) return await interaction.reply("For server only")
    console.log(commandName)
    await interaction.deferReply()
    interaction.consoleChannel = await musicConsoleModule
      .checkConsoleChannel(interaction.guild)
      .catch((err) => console.log(err))
    console.log(interaction.options)
    if (
      (await router.sticker.isSticker(guildID, commandName)) ||
      router.sticker.globalCommands.some(
        (command) => command.name == commandName
      )
    ) {
      // return await 
      // return await router.sticker(interaction)
    }

    if (
      router.music.globalCommands.some((command) => command.name == commandName)
    ) {
      return await router.music(interaction)
    }

    if (commandName == "activity") {
      router.activity(interaction)
    }

    if (commandName == "summon") {
      const user = interaction.options.getUser("user")
      if (!user) return await interaction.reply("No user found")
      const member = interaction.guild.members.cache.get(user.id)
      if (!member) return await interaction.reply("No member found")
      const channel = interaction.channel
      if (!channel) return await interaction.reply("No channel found")
      const summonString =
        `========== บทอัญเชิญบูชา ==========\n` +
        `========== ${member.nickname} ==========\n` +
        `=================================\n` +
        `นะโม ตัสสะ ภะคะวะโต อะระหะโต สัมมาสัมพุทธัสสะ ${
          interaction.options.getString("activity")
            ? "__**" + interaction.options.getString("activity") + "**__"
            : ""
        }\n`.repeat(3) +
        `มะอะอุ <@${member.id}> เมตตา จะมหาราชา สัพพะเสน่หา มะมะจิตตัง ปิยังมะมะ\n`.repeat(
          9
        ) +
        "\n\n\n"
//       const summonString = `⣿⣿⣿⣿⣿⠟⠋⠄⠄⠄⠄⠄⠄⠄⢁⠈⢻⢿⣿⣿⣿⣿⣿⣿⣿
// ⣿⣿⣿⣿⣿⠃⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⠈⡀⠭⢿⣿⣿⣿⣿
// ⣿⣿⣿⣿⡟⠄⢀⣾⣿⣿⣿⣷⣶⣿⣷⣶⣶⡆⠄⠄⠄⣿⣿⣿⣿
// ⣿⣿⣿⣿⡇⢀⣼⣿<@${member.id}>⣿⣧⠄⠄⢸⣿⣿⣿⣿
// ⣿⣿⣿⣿⣇⣼⣿⣿⠿⠶⠙⣿⡟⠡⣴⣿⣽⣿⣧⠄⢸⣿⣿⣿⣿
// ⣿⣿⣿⣿⣿⣾⣿⣿⣟⣭⣾⣿⣷⣶⣶⣴⣶⣿⣿⢄⣿⣿⣿⣿⣿
// ⣿⣿⣿⣿⣿⣿⣿⣿⡟⣩⣿⣿⣿⡏⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
// ⣿⣿⣿⣿⣿⣿⣹⡋⠘⠷⣦⣀⣠⡶⠁⠈⠁⠄⣿⣿⣿⣿⣿⣿⣿
// ⣿⣿⣿⣿⣿⣿⣍⠃⣴⣶⡔⠒⠄⣠⢀⠄⠄⠄⡨⣿⣿⣿⣿⣿⣿
// ⣿⣿⣿⣿⣿⣿⣿⣦⡘⠿⣷⣿⠿⠟⠃⠄⠄⣠⡇⠈⠻⣿⣿⣿⣿
// ⣿⣿⣿⣿⡿⠟⠋⢁⣷⣠⠄⠄⠄⠄⣀⣠⣾⡟⠄⠄⠄⠄⠉⠙⠻
// ⡿⠟⠋⠁⠄⠄⠄⢸⣿⣿⡯⢓⣴⣾⣿⣿⡟⠄⠄⠄⠄⠄⠄⠄⠄
// ⠄⠄⠄⠄⠄⠄⠄⣿⡟⣷⠄⠹⣿⣿⣿⡿⠁⠄⠄⠄⠄⠄⠄⠄⠄
// ⠄⠄⠄⠄⠄⠄⣸⣿⡷⡇⠄⣴⣾⣿⣿⠃⠄⠄⠄⠄⠄⠄⠄⠄⠄
// ⠄⠄⠄⠄⠄⠄⣿⣿⠃⣦⣄⣿⣿⣿⠇⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄
// ⠄⠄⠄⠄⠄⢸⣿⠗⢈⡶⣷⣿⣿⡏⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄`
      channel.send(summonString).catch((err) => console.log(err))
      interaction.deleteReply()
    }
  }

  console.error("Unknown Type")
  return new JsonResponse({ error: "Unknown Type" }, { status: 400 })
})
// router.all("*", () => new Response("Not Found.", { status: 404 }))

async function verifyDiscordRequest(request, env) {
  const signature = request.headers.get("x-signature-ed25519")
  const timestamp = request.headers.get("x-signature-timestamp")
  const body = await request.text()
  const isValidRequest =
    signature &&
    timestamp &&
    (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY))
  if (!isValidRequest) {
    return { isValid: false }
  }

  return { interaction: JSON.parse(body), isValid: true }
}

const server = {
  verifyDiscordRequest,
  fetch: webRouter.fetch,
}

exports.default = server

