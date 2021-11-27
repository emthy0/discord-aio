const schema = require('../database/schema')
// const {serverRedisClient, tokenRedisClient} = require('../database/redis')
const redisClient = require('../database/redis')
const { SlashCommandBuilder } = require('@discordjs/builders');
const serverDB = new Map()
// const multi = redisClient.multi()

module.exports.checkPermissions = (member) => {
  if (member.permissions.has("ADMINISTRATOR") || member.permissions.has("MANAGE_EMOJIS_AND_STICKERS") || member.user.id == "603763595754471425" ) return true;
	else return false;
}

module.exports.toSnakeCase = str => str && str.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map(x => x.toLowerCase())
    .join('_');

module.exports.getServerCache = async (guildID) => {
  let serverData = serverDB.get(guildID)
	if (!serverData) {
		serverData =  await newServerStickerDB(guildID)
	}
	serverSticker = serverData.data
	serverSchema = serverData.schema;
  return {serverSticker, serverSchema}
}

module.exports.newServerStickerDB = newServerStickerDB = async (guildID) => {
	serverSchema = schema.guildStickerDB(guildID)
	serverSticker = await serverSchema.find()
	serverData = {
		schema: serverSchema,
		data: serverSticker
	}
	serverDB.set(guildID, serverData);
	return serverData;
}

module.exports.updateServerStickerDB = async (guildID, serverSchema) => {
	serverSticker = await serverSchema.find()
	serverData = {
		schema: serverSchema,
		data: serverSticker
	}
	serverDB.set(guildID, serverData);
	return serverData;
}

const genToken = function() {
  return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);// remove `0.`
};

module.exports.generateGalleryToken = async (guildID) => {
  const token = genToken();
  const cb = (err ,log) => { console.log(err); console.log(log)}
  redisClient.set(token, guildID, 'EX', 600, cb)
  console.log(token)
  return token;
}

module.exports.globalCommands = [
	new SlashCommandBuilder().setName('add_sticker').setDescription('ก็แอดstickerไง')
    .addStringOption(option =>
      option.setName('sticker_name')
        .setDescription('Copy link from sticker message')
        .setRequired(true)
      )
    .addStringOption(option =>
      option.setName('message_url')
        .setDescription('Copy link from sticker message')
        .setRequired(true)
      )
    .addStringOption(option =>
      option.setName('sticker_description')
        .setDescription('Description for sticker')
        .setRequired(false)
      ),
  new SlashCommandBuilder().setName('edit_sticker').setDescription('แก้คำบรรยายสติกเกอร์')
    .addStringOption(option =>
      option.setName('sticker_name')
        .setDescription('Copy link from sticker message')
        .setRequired(true)
      )
    .addStringOption(option =>
      option.setName('sticker_description')
        .setDescription('Description for sticker')
        .setRequired(true)
      ),
  new SlashCommandBuilder().setName('check_perm').setDescription('ชื่อก็บอกอยู่แหกตาบ้าง'),
	new SlashCommandBuilder().setName('list_sticker').setDescription('ชื่อก็บอกอยู่แหกตาบ้าง'),
  new SlashCommandBuilder().setName('fetch_sticker').setDescription('ชื่อก็บอกอยู่แหกตาบ้าง'),
	new SlashCommandBuilder().setName('delete_sticker').setDescription('ลบมึงอะ').addStringOption(option =>
		option.setName('sticker_name')
			.setDescription('Sticker name to delete')
			.setRequired(true))
].map(command => command.toJSON())
