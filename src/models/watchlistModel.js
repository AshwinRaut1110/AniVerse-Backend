const mongoose = require("mongoose");
const { watch } = require("./commentLikeModel");

const watchlistSchema = mongoose.Schema({
  anime: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Anime",
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  status: {
    type: String,
    enum: {
      values: ["watching", "plan to watch", "completed", "dropped", "on hold"],
      message:
        "Status value can only be (watching | plan to watch | completed | dropped | on hold).",
    },
    default: "watching",
  },
  thumbnail: {
    type: String,
  },
  title: {
    type: String,
    required: [true, "The anime title is required."],
  },
});

watchlistSchema.index({ anime: 1, user: 1 }, { unique: true });

const Watchlist = mongoose.model("Watchlist", watchlistSchema);

module.exports = Watchlist;
