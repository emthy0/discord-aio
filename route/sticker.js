const { SlashCommandBuilder } = require('@discordjs/builders');
const {checkPermissions, updateServerStickerDB, generateGalleryToken, getServerCache, toSnakeCase} = require('../modules/stickers')
const registerModule = require('../modules/register')
module.exports = async function (interaction) {
  const { commandName } = interaction;
	console.log('Using Sticker module', commandName);
  const channelID = interaction.channelId
	const guildID = interaction.guildId

  const {serverSticker, serverSchema} = await getServerCache(guildID)
  
  switch (commandName) {
		case 'check_perm': {
			const perm = checkPermissions(interaction.member) ? 'allow' : 'deny'
			return await interaction.editReply(perm)
		}

		case 'list_sticker': {
			if (serverSticker.length == 0) return await interaction.editReply('No sticker on this server')
			// else return await interaction.reply(serverSticker.map(sticker => sticker.stickerName).join(', '))
			
			else {
				const token = await generateGalleryToken(guildID)
				// return await interaction.reply(`https://stickers-gallary.herokuapp.com/?gid=${guildID}`)
				return await interaction.editReply(`https://stickers-gallary.herokuapp.com/?token=${token}`)
			}
		}

		case 'add_sticker': {
			if (!checkPermissions(interaction.member)) return await interaction.reply(`You don't have permissions`);
			newStickerURL = interaction.options.get('message_url').value;
			newStickerName = toSnakeCase(interaction.options.get('sticker_name').value);
			newStickerDesc = interaction.options.get('sticker_description')?.value || 'สติกเกอร์โง่ๆอันนึง';
			if (serverSticker.some(sticker => sticker.stickerName == newStickerName)) return await interaction.editReply(`Sticker name already exists.`)
			const stickerModel = new serverSchema({
				guildID: guildID,
				stickerName: newStickerName,
				stickerUrl: newStickerURL,
				stickerCreator: interaction.user.username,
				stickerDescription: newStickerDesc
			})
			await stickerModel.save()
			const { data } = await updateServerStickerDB(guildID, serverSchema)
			await registerModule.updateStickerCommand(guildID, data)

			return await stickerModel.save().then(()=> interaction.editReply(`${newStickerName} added`)).catch(()=> interaction.reply('Error'))
		}

		case 'edit_sticker': {
			if (!checkPermissions(interaction.member)) return await interaction.reply(`You don't have permissions`);
			newStickerName = toSnakeCase(interaction.options.get('sticker_name').value);
			newStickerDesc = interaction.options.get('sticker_description').value;
			if (!serverSticker.some(sticker => sticker.stickerName == newStickerName)) return await interaction.reply(`Sticker does not exists.`)
			await serverSchema.findOneAndUpdate({stickerName: newStickerName}, {$set: {stickerDescription: newStickerDesc}})
			const { data } = await updateServerStickerDB(guildID, serverSchema)
			await registerModule.updateStickerCommand(guildID, data)

			return await interaction.editReply(`${newStickerName} edited`)
		}

		case 'delete_sticker': {
			if (!checkPermissions(interaction.member)) return await interaction.reply(`You don't have permissions`);
			stickerName = interaction.options.get('sticker_name').value
			await serverSchema.findOneAndDelete({stickerName})
			const { data } = await updateServerStickerDB(guildID, serverSchema)
			registerModule.updateStickerCommand(guildID, data)
			return await interaction.editReply(`${stickerName} has been removed`)
		}

		case 'fetch_sticker': {
			const { data } = await updateServerStickerDB(guildID, serverSchema)
			registerModule.updateStickerCommand(guildID, data)
			return await interaction.editReply('Fetched')
		}

		default: {
			sticker = serverSticker.find(sticker =>sticker.stickerName == commandName)
			if (!sticker) return await interaction.reply('No sticker found')
			return await interaction.editReply(sticker.stickerUrl)
		}
	}
}

module.exports.isSticker = async (guildID, stickerName) => {
  const {serverSticker} = await getServerCache(guildID)
	return serverSticker.some(sticker => sticker.stickerName == stickerName)
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
  new SlashCommandBuilder().setName('check_perm').setDescription('---'),
	new SlashCommandBuilder().setName('list_sticker').setDescription('เปิดGallery'),
  new SlashCommandBuilder().setName('fetch_sticker').setDescription('อัพเดทคำสั่ง'),
	new SlashCommandBuilder().setName('delete_sticker').setDescription('ลบสติกเกอร์').addStringOption(option =>
		option.setName('sticker_name')
			.setDescription('Sticker name to delete')
			.setRequired(true))
].map(command => command.toJSON())