const { SlashCommandBuilder } = require('@discordjs/builders');
const { speak, stopTts } = require('../modules/tts');

module.exports = async (interaction) => {
  const { commandName } = interaction;
  switch (commandName) {
    case 'tts':
    case 't2s':
      return await speak(interaction);
    case 'tts-stop':
      return await stopTts(interaction);
    default:
      await interaction.editReply('ยังไม่ได้ทำ');
      return setTimeout(async () => { await interaction.deleteReply(); }, 5000);
  }
};

module.exports.globalCommands = [
  new SlashCommandBuilder()
    .setName('tts')
    .setDescription('พูดข้อความในห้องเสียง (Text-to-Speech)')
    .addStringOption(option =>
      option.setName('text')
        .setDescription('ข้อความที่ต้องการพูด')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('lang')
        .setDescription('ภาษา (default: th)')
        .setRequired(false)
        .addChoice('ไทย', 'th')
        .addChoice('English', 'en')
        .addChoice('日本語', 'ja')
        .addChoice('한국어', 'ko')
        .addChoice('中文', 'zh-CN')
    ),
  new SlashCommandBuilder()
    .setName('tts-stop')
    .setDescription('หยุดพูด TTS'),
].map(command => command.toJSON());
