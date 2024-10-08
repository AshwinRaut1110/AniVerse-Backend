const Review = require("../models/reviewModel");
const catchAsyncErrors = require("../util/catchAsyncErrors");
const APIFeatures = require("../util/APIFeatures");
const CustomError = require("../util/CustomError");
const Anime = require("../models/animeModel");
const ReviewVote = require("../models/reviewVoteModel");
const User = require("../models/userModel");

const getAllReviews = catchAsyncErrors(async (req, res, next) => {
  // check if an anime id has been provided, if yes just return the reviews for that anime

  const filter = {};

  if (req.params.animeId) filter.anime = req.params.animeId;

  const apiFeatures = new APIFeatures(Review.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .pagination();

  const reviews = await apiFeatures.query.populate({
    path: "user",
    select: "username profilePicture",
  });

  res.send({
    status: "success",
    results: reviews.length,
    data: {
      reviews,
    },
    page: req.query.page || 1,
  });
});

const createReview = catchAsyncErrors(async (req, res, next) => {
  if (!req.params.animeId)
    return next(
      new CustomError(400, "an anime id must be provided for the review.")
    );

  // check if the anime with the anime id exists
  const anime = await Anime.findById(req.params.animeId);

  if (!anime)
    return next(new CustomError(404, "anime with the provided id not found."));

  // make sure the user hasn't already reviewed the anime
  const existingReview = await Review.findOne({
    user: req.user._id,
    anime: req.params.animeId,
  });

  if (existingReview)
    return next(
      new CustomError(400, "you already have a review on this anime")
    );

  // set the author of the review to the user whose jwt was used for the request
  delete req.body.user;
  delete req.body.anime;

  // remove any empty reviews
  if (req.body.review?.trim().length === 0) delete req.body.review;

  // add the user and anime id to the review
  req.body.user = req.user._id;
  req.body.anime = req.params.animeId;

  const createdReview = await Review.create(req.body);

  if (!createdReview)
    return next(new CustomError(400, "Unable to create the review."));

  // update the reviewGiven user stat
  req.user.stats.reviewsGiven++;

  await req.user.save();

  res.status(201).send({
    status: "success",
    data: {
      review: createdReview,
    },
  });
});

const getReviewById = catchAsyncErrors(async (req, res, next) => {
  const review = await Review.findOne({
    _id: req.params.reviewId,
    anime: req.params.animeId,
  });

  if (!review)
    return next(
      new CustomError(404, "review with the provided id was not found.")
    );

  res.send({
    status: "success",
    data: {
      review,
    },
  });
});

// get a user's review for a particular anime
const getMyReview = catchAsyncErrors(async (req, res, next) => {
  const review = await Review.findOne({
    user: req.user._id,
    anime: req.params.animeId,
  });

  if (!review)
    return next(
      new CustomError(404, "you do not have a review for this anime yet.")
    );

  res.send({
    status: "success",
    data: {
      review,
    },
  });
});

// update a user's review
const updateMyReview = catchAsyncErrors(async (req, res, next) => {
  const existingReview = await Review.findOne({
    user: req.user._id,
    anime: req.params.animeId,
  });

  if (!existingReview)
    return next(
      new CustomError(404, "you do not have a review for this anime yet.")
    );

  // this is set to allow for changing the average anime rating in the pre save middleware
  existingReview.oldReviewRating = existingReview.rating;

  const allowedFields = ["rating", "review", "title", "spoiler"];

  Object.keys(req.body).forEach((update) => {
    if (allowedFields.includes(update)) {
      existingReview[update] = req.body[update];
    }
  });

  const updatedReview = await existingReview.save();

  res.send({
    status: "success",
    data: {
      review: updatedReview,
    },
  });
});

// delete a user's review
const deleteMyReview = catchAsyncErrors(async (req, res, next) => {
  const deletedDocument = await Review.findOneAndDelete(
    {
      user: req.user._id,
      anime: req.params.animeId,
    },
    {
      returnDocument: true,
    }
  );

  if (!deletedDocument)
    return next(
      new CustomError(404, "you do not have a review for this anime yet.")
    );

  // update the reviewGiven user stat
  req.user.stats.reviewsGiven--;

  await req.user.save();

  res.status(204).send({
    status: "success",
    data: null,
  });
});

const addNotHelpfulVote = catchAsyncErrors(async (req, res, next) => {
  // get the review by associated with the vote
  const review = await Review.findById(req.params.reviewId);

  if (!review)
    return next(
      new CustomError(404, "A review with the given id was not found.")
    );

  // find the user who reviewed wrote the review since we need to update the notHelpfulVote count for that user
  const reviewer = await User.findById(review.user);

  if (!reviewer)
    return next(new CustomError(404, "Unable to mark the review as helpful."));

  // check if the vote already exists
  let vote = await ReviewVote.findOne({
    review: req.params.reviewId,
    user: req.user._id,
  });

  if (!vote) {
    // if the vote does not already exist create a new one
    vote = await ReviewVote.create({
      helpful: false,
      review: review._id,
      anime: req.params.animeId,
      user: req.user._id,
    });

    if (!vote) return next(new CustomError(400, "unable to save your vote"));

    review.notHelpfulVotes++;

    await review.save();

    // updating the notHelpfulVotes stat for the user who wrote the review
    reviewer.stats.notHelpfulVotes++;

    await reviewer.save();

    res.send({ status: "success", data: { vote, isNew: true } });
  } else {
    // if the vote already exists and is already marked as not helpful just send an error
    if (!vote.helpful)
      return next(
        new CustomError(
          400,
          "You have already marked this review as not helpful."
        )
      );

    // otherwise just mark it as not helpful
    vote.helpful = false;

    review.helpfulVotes--;
    review.notHelpfulVotes++;

    await vote.save();
    await review.save();

    // updating the notHelpfulVotes stat for the user who wrote the review
    reviewer.stats.notHelpfulVotes++;
    reviewer.stats.helpfulVotes--;

    await reviewer.save();

    res.send({ status: "success", data: { vote } });
  }
});

const addHelpfulVote = catchAsyncErrors(async (req, res, next) => {
  // get the review by associated with the vote
  const review = await Review.findOne({
    _id: req.params.reviewId,
    anime: req.params.animeId,
  });

  if (!review)
    return next(
      new CustomError(404, "A review with the given id was not found.")
    );

  // find the user who reviewed wrote the review since we need to update the notHelpfulVote count for that user
  const reviewer = await User.findById(review.user);

  if (!reviewer)
    return next(new CustomError(404, "Unable to mark the review as helpful."));

  // check if the vote already exists
  let vote = await ReviewVote.findOne({
    review: req.params.reviewId,
    anime: req.params.animeId,
    user: req.user._id,
  });

  if (!vote) {
    // if the vote does not already exist create a new one
    vote = await ReviewVote.create({
      helpful: true,
      review: review._id,
      anime: req.params.animeId,
      user: req.user._id,
    });

    if (!vote) return next(new CustomError(400, "unable to save your vote"));

    review.helpfulVotes++;

    await review.save();

    // updating the helpfulVotes stat for the user who wrote the review
    reviewer.stats.helpfulVotes++;

    await reviewer.save();

    res.send({ status: "success", data: { vote, isNew: true } });
  } else {
    // if the vote already exists and is already marked as helpful just send an error
    if (vote.helpful)
      return next(
        new CustomError(400, "You have already marked this review as helpful.")
      );

    // otherwise just mark it as helpful
    vote.helpful = true;

    review.helpfulVotes++;
    review.notHelpfulVotes--;

    await vote.save();
    await review.save();

    // updating the helpfulVotes stat for the user who wrote the review
    reviewer.stats.helpfulVotes++;
    reviewer.stats.notHelpfulVotes--;

    await reviewer.save();

    res.send({ status: "success", data: { vote } });
  }
});

module.exports = {
  getAllReviews,
  createReview,
  getReviewById,
  getMyReview,
  updateMyReview,
  deleteMyReview,
  addHelpfulVote,
  addNotHelpfulVote,
};
