// const { generateDependencyReport } = require('@discordjs/voice');
// const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports.ApplicationIndex = ApplicationIndex = {
  "Youtube_Together": "755600276941176913",
  "watch_together_dev": "880218832743055411",
  "Fishington": "814288819477020702",
  "chess_in_the_park": "832012774040141894",
  "chess_in_the_park_dev": "832012586023256104",
  "Betrayal": "773336526917861400",
  "Doodlecrew": "878067389634314250",
  "Wordsnacks": "879863976006127627",
  "Lettertile": "879863686565621790",
  "Poker_night": "755827207812677713"
}

module.exports.createInvite = async (guild, channel, activityName) => { 
  const activityID = ApplicationIndex[activityName];
  const GuildInviteManager = guild.invites
  return await GuildInviteManager.create(channel, { 
    maxAge: 0,
    targetType: 2,
    targetApplication: activityID
  })
}



// module.exports.globalCommands = [
//   new SlashCommandBuilder().setName('activity').setDescription('เล่นจู๋!!!!!')
//   .addChannelOption(option =>
//     option.setName('channel')
//       .setDescription('ช่องที่จะเล่น')
//       .setRequired(true)
//   )
//   .addStringOption(option =>
//     option.setName('activity')
//       .setDescription('จะเล่นท่าไหน')
//       .setRequired(true)
//       .addChoice('Youtube_Together', '755600276941176913')
// 			.addChoice('Fishington', '814288819477020702')
// 			.addChoice('Doodlecrew', '878067389634314250')
//       .addChoice('Poker night', '755827207812677713')
//       .addChoice('Wordsnacks', '879863976006127627')
//       .addChoice('Lettertile', '879863686565621790')
//       .addChoice('Betrayal', '773336526917861400')
//   )
// ]