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
});

const Watchlist = mongoose.Model("Watchlist", watchlistSchema);
