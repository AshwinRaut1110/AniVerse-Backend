const mongoose = require("mongoose");

const animeSchema = new mongoose.Schema({
  names: {
    english: { type: String, required: [true, "An english name is required"] },
    japanese: String,
  },
  type: {
    type: String,
    enum: {
      values: ["TV", "OVA", "ONA", "MOVIE"],
      message: "Type can only be on of (TV|OVA|ONA|MOVIE).",
    },
    default: "TV",
  },
  episodes: {
    type: Number,
    min: 0,
  },
  status: {
    type: String,
    enum: {
      values: ["not yet aired", "ongoing", "finished airing"],
      message:
        "the allowed values are (not yet aired|ongoing|finished airing).",
    },
    default: "ongoing",
  },
  premiered: {
    season: {
      type: String,
      enum: {
        values: ["fall", "summer", "spring", "winter"],
        message: "The allowed values are (fall|summer|spring|winter)",
      },
      required: [true, "premeiere season is required."],
    },
    year: {
      type: Number,
      required: [true, "premeiere year is required."],
      min: 0,
    },
  },
  aired: {
    startDate: Date,
    endDate: Date,
  },
  genres: [
    {
      type: String,
      enum: [
        "action",
        "adventure",
        "avant Garde",
        "award Winning",
        "comedy",
        "drama",
        "fantasy",
        "gourmet",
        "horror",
        "mystery",
        "romance",
        "sci-Fi",
        "slice of Life",
        "sports",
        "supernatural",
        "suspense",
      ],
      required: [true, "genres are required."],
    },
  ],
  studios: [String],
  producers: [String],
  duration: {
    type: Number,
    min: 0,
  },
  relatedAnimes: [
    {
      anime: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Anime",
      },
      relation: {
        type: String,
        enum: {
          values: ["prequel", "sequel", "spin-off", "current"],
          message: "allowed values are (prequel|sequel|spin-off|current).",
        },
        required: [true, "related anime relation is required."],
      },
    },
  ],
  description: {
    type: String,
    trim: true,
    required: [true, "A description is required."],
  },
  broadcast: String,
  country: {
    type: String,
    enum: {
      values: ["JAPAN", "CHINA", "KOREA"],
      message: "allowed values are (JAPAN|CHINA|KOREA).",
    },
  },
  thumbnail: {
    type: String,
  },
  banner: {
    type: String,
  },
  averageRating: {
    type: Number,
    default: 0,
  },
  ratingsQuantity: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Anime = mongoose.model("Anime", animeSchema);

module.exports = Anime;
