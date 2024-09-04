const mongoose = require("mongoose");
const CommentLike = require("./commentLikeModel");

const commentSchema = new mongoose.Schema({
  comment: {
    type: String,
    required: [true, "comment text is required."],
    trim: true,
  },
  likes: {
    type: Number,
    default: 0,
    min: 0,
  },
  dislikes: {
    type: Number,
    default: 0,
    min: 0,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  username: {
    type: String,
    trim: true,
    required: [true, "username is required."],
  },
  profilePicture: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  episode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Episode",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  modifiedAt: Date,
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
  },
});

commentSchema.post("findOneAndDelete", async (doc) => {
  // delete all the likes and dislikes associated with a comment when the comment is deleted
  await CommentLike.deleteMany({ comment: doc._id });
});

const Comment = mongoose.model("Commnet", commentSchema);

module.exports = Comment;
