const mongoose = require("mongoose");
const Anime = require("./animeModel");

const reviewSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
  },
  review: {
    type: String,
    trim: true,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    required: [true, "A rating score is required."],
  },
  helpfulVotes: {
    type: Number,
    default: 0,
    min: 0,
  },
  notHelpfulVotes: {
    type: Number,
    default: 0,
    min: 0,
  },
  spoiler: Boolean,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  anime: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Anime",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  modifiedAt: {
    type: Date,
  },
  oldReviewRating: Number, // for average anime ratings calculation
});

// update the average rating of an anime when a review is saved, updated or deleted
reviewSchema.pre("save", async function (next) {
  // if the review is saved for the first time
  if (this.isNew) {
    // find the anime for this review
    const anime = await Anime.findById(this.anime);

    let totalReviewScore = anime.averageRating * anime.ratingsQuantity;

    // calculate the new total review score
    totalReviewScore += this.rating;

    anime.ratingsQuantity++;

    anime.averageRating = totalReviewScore / anime.ratingsQuantity;

    await anime.save();
  }

  // if the review rating is modified
  if (this.isModified("rating") && this.oldReviewRating) {
    // find the anime for this review
    const anime = await Anime.findById(this.anime);

    let totalReviewScore = anime.averageRating * anime.ratingsQuantity;

    // calculate the new total review score
    totalReviewScore -= this.oldReviewRating;

    totalReviewScore += this.rating;

    anime.averageRating = totalReviewScore / anime.ratingsQuantity;

    await anime.save();
  }

  this.oldReviewRating = undefined;

  next();
});

// calcalate the average rating when the user deletes his review
reviewSchema.post("findOneAndDelete", async function (deletedDocument) {
  if (!deletedDocument) return;

  // find the anime for this review
  const anime = await Anime.findById(deletedDocument.anime);

  let totalReviewScore = anime.averageRating * anime.ratingsQuantity;

  anime.ratingsQuantity--;

  if (anime.ratingsQuantity === 0) {
    anime.averageRating = 0;
  } else {
    totalReviewScore -= deletedDocument.rating;
    anime.averageRating = totalReviewScore / anime.ratingsQuantity;
  }

  await anime.save();
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
