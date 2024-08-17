const mongoose = require("mongoose");

const episodeSchema = new mongoose.Schema({
  episodeNumber: {
    type: Number,
    unique: true,
    min: 0,
    required: [true, "an episode number is required."],
  },
  title: {
    english: {
      type: String,
      required: [true, "a english episode name is required."],
    },
    japanese: String,
  },
  streamLink: String,
  anime: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Anime",
    required: [true, "an episode must belong to a anime"],
  },
  description: {
    type: String,
    minLength: 20,
  },
  releasedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  thumbnail: String,
  versions: {
    360: {
      type: Boolean,
      default: false,
    },
    480: {
      type: Boolean,
      default: false,
    },
    720: {
      type: Boolean,
      default: false,
    },
  },
});

const Episode = mongoose.model("Episode", episodeSchema);

module.exports = Episode;
