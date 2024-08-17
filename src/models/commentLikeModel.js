const mongoose = require("mongoose");

const CommentLikeSchema = new mongoose.Schema({
  like: {
    required: [true, "a like or a dislike is required."],
    type: Boolean,
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const CommentLike = mongoose.model("CommentLike", CommentLikeSchema);

module.exports = CommentLike;
