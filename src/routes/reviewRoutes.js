const express = require("express");
const {
  getAllReviews,
  createReview,
  getReviewById,
  getMyReview,
  updateMyReview,
  deleteMyReview,
} = require("../controllers/reviewController");
const { protect } = require("../controllers/authController");

const reviewRouter = express.Router({ mergeParams: true });

reviewRouter.route("/").get(getAllReviews).post(protect, createReview);

reviewRouter
  .route("/my-review")
  .get(protect, getMyReview)
  .patch(protect, updateMyReview)
  .delete(protect, deleteMyReview);

reviewRouter.route("/:reviewId").get(getReviewById);

module.exports = reviewRouter;
