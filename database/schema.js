const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports.guildStickerDB = (guildID) => mongoose.model(
  guildID,
  new Schema({
    guildID: String,
    stickerName: String,
    stickerUrl: String,
    stickerCreator: String,
    stickerDescription: String,
  }),guildID
);

// module.exports.newStickerModel = (guildID, data) => new mongoose.model(
//   guildID,
//   new Schema({
//     guildID: String,
//     stickerName: String,
//     stickerUrl: String,
//     stickerCreator: String,
//   }),guildID
// )(data)