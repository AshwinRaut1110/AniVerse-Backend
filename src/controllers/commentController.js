const Comment = require("../models/commentModel");
const CustomError = require("../util/CustomError");
const catchAsyncErrors = require("../util/catchAsyncErrors");
const Episode = require("../models/episodeModel");
const CommentLike = require("../models/commentLikeModel");
const APIFeatures = require("../util/APIFeatures");

const createComment = catchAsyncErrors(async (req, res, next) => {
  if (!req.params.episodeId)
    return next(new CustomError(400, "Episode id must be provided."));

  const episode = await Episode.findById(req.params.episodeId);

  if (!episode)
    return next(
      new CustomError(400, "Episode with the provided id was not found.")
    );

  // if this comment is a reply to another comment then check if the parent comment exists
  let parentComment;

  if (req.body.parent)
    parentComment = await Comment.findOne({ _id: req.body.parent });

  if (req.body.parent && !parentComment)
    return next(
      new CustomError(400, "Parent comment with the provided id was not found.")
    );

  const commentData = {
    ...req.body,
    episode: req.params.episodeId,
    user: req.user._id,
    username: req.user.username,
    profilePicture: req.user.profilePicture,
  };

  const comment = await Comment.create(commentData);

  // update the comments made user stat
  req.user.stats.commentsMade++;

  await req.user.save();

  // update the parent comments number of replies
  if (req.body.parent) {
    parentComment.numberOfReplies++;
    await parentComment.save();
  }

  res.status(201).send({
    status: "success",
    data: {
      comment,
    },
  });
});

const updateComment = catchAsyncErrors(async (req, res, next) => {
  const comment = await Comment.findOne({
    _id: req.params.commentId,
    episode: req.params.episodeId,
    user: req.user._id,
  });

  if (!comment)
    return next(
      new CustomError(404, "Comment with the provided id not found.")
    );

  comment.comment = req.body.comment;

  const updatedComment = await comment.save();

  res.send({
    status: "success",
    data: {
      comment: updatedComment,
    },
  });
});

const getAllCommentOfAEpisode = catchAsyncErrors(async (req, res, next) => {
  if (!req.params.episodeId)
    return next(new CustomError(400, "Episode id must be provided."));

  const apiFeatures = new APIFeatures(
    Comment.find({
      episode: req.params.episodeId,
      parent: undefined,
    }),
    req.query
  )
    .sort()
    .filter()
    .limitFields()
    .pagination();

  const comments = await apiFeatures.query;

  res.send({
    status: "success",
    results: comments.length,
    data: {
      comments,
    },
  });
});

const getRepliesToAComment = catchAsyncErrors(async (req, res, next) => {
  if (!req.params.episodeId)
    return next(new CustomError(400, "Episode id must be provided."));

  const apiFeatures = new APIFeatures(
    Comment.find({
      episode: req.params.episodeId,
      parent: req.params.commentId,
    }),
    req.query
  )
    .sort()
    .filter()
    .limitFields()
    .pagination();

  const replies = await apiFeatures.query;

  res.send({
    status: "success",
    results: replies.length,
    data: {
      replies,
    },
  });
});

const deleteAComment = catchAsyncErrors(async (req, res, next) => {
  // delete the comment
  const deletedComment = await Comment.findOneAndDelete(
    {
      _id: req.params.commentId,
      user: req.user._id,
    },
    { returnDocument: true }
  );

  if (!deletedComment)
    return next(
      new CustomError(404, "Comment with the provided id was not found.")
    );

  // delete all the replies to that comment
  const replies = await Comment.find({
    episode: req.params.episodeId,
    parent: req.params.commentId,
  });

  replies.forEach(async (reply) => {
    await Comment.findOneAndDelete(
      { _id: reply._id },
      { returnDocument: true }
    );
  });

  res.status(204).send({
    status: "success",
    data: null,
  });
});

const likeAComment = catchAsyncErrors(async (req, res, next) => {
  const comment = await Comment.findById(req.params.commentId);

  if (!comment)
    return next(
      new CustomError(404, "Comment with the provided id not found.")
    );

  let commentLike = await CommentLike.findOne({
    comment: req.params.commentId,
    user: req.user._id,
  });

  // if the user hasnt already liked the comment create a new like
  if (!commentLike) {
    commentLike = await CommentLike.create({
      like: true,
      comment: comment._id,
      user: req.user._id,
    });

    comment.likes++;

    await comment.save();

    res.status(201).send({
      status: "success",
      data: {
        commentLike,
        isNew: true,
      },
    });
  } else {
    if (commentLike.like)
      return next(new CustomError(400, "you have already liked this comment."));

    commentLike.like = true;

    comment.likes++;
    comment.dislikes--;

    await commentLike.save();
    await comment.save();

    res.send({
      status: "success",
      data: {
        commentLike,
      },
    });
  }
});

const dislikeAComment = catchAsyncErrors(async (req, res, next) => {
  const comment = await Comment.findById(req.params.commentId);

  if (!comment)
    return next(
      new CustomError(404, "Comment with the provided id not found.")
    );

  let commentLike = await CommentLike.findOne({
    comment: req.params.commentId,
    user: req.user._id,
  });

  // if the user hasnt already disliked the comment create a new dislike
  if (!commentLike) {
    commentLike = await CommentLike.create({
      like: false,
      comment: comment._id,
      user: req.user._id,
    });

    comment.dislikes++;

    await comment.save();

    res.status(201).send({
      status: "success",
      data: {
        commentLike,
        isNew: true,
      },
    });
  } else {
    if (!commentLike.like)
      return next(
        new CustomError(400, "you have already disliked this comment.")
      );

    commentLike.like = false;

    comment.dislikes++;
    comment.likes--;

    await commentLike.save();
    await comment.save();

    res.send({
      status: "success",
      data: {
        commentLike,
      },
    });
  }
});

const findUserLike = catchAsyncErrors(async (req, res, next) => {
  const { commentId } = req.params;

  const commentLike = await CommentLike.findOne({
    comment: commentId,
    user: req.user._id,
  });

  if (!commentLike)
    return next(new CustomError(204, "you haven't liked this comment yet."));

  res.send({
    status: "success",
    data: {
      commentLike,
    },
  });
});

module.exports = {
  createComment,
  updateComment,
  getAllCommentOfAEpisode,
  getRepliesToAComment,
  deleteAComment,
  likeAComment,
  dislikeAComment,
  findUserLike,
};
