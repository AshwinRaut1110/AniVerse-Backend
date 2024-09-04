const express = require("express");
const { protect, restrictTo } = require("../controllers/authController");
const {
  createComment,
  updateComment,
  getAllCommentOfAEpisode,
  getRepliesToAComment,
  deleteAComment,
  likeAComment,
  dislikeAComment,
  findUserLike,
} = require("../controllers/commentController");

const commnetRouter = express.Router({ mergeParams: true });

commnetRouter
  .route("/")
  .get(getAllCommentOfAEpisode)
  .post(protect, createComment);

commnetRouter
  .route("/:commentId")
  .patch(protect, updateComment)
  .delete(protect, deleteAComment);

commnetRouter.route("/:commentId/replies").get(getRepliesToAComment);

commnetRouter.route("/:commentId/like").post(protect, likeAComment);

commnetRouter.route("/:commentId/dislike").post(protect, dislikeAComment);

commnetRouter.route("/:commentId/getlike").get(protect, findUserLike);

module.exports = commnetRouter;
