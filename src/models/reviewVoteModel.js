const mongoose = require("mongoose");

const ReviewVoteSchema = new mongoose.Schema({
  helpful: {
    required: [true, "a vote is required."],
    type: Boolean,
  },
  anime: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Anime",
  },
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Review",
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const ReviewVote = mongoose.model("ReviewVote", ReviewVoteSchema);

module.exports = ReviewVote;
