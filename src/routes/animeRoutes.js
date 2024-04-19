const express = require("express");
const { protect, restrictTo } = require("../controllers/authController");
const {
  createAnime,
  updateAnime,
  updateThumbnail,
  getAnimeDetails,
} = require("../controllers/animeController");

const multer = require("multer");
const reviewRouter = require("./reviewRoutes");

const upload = multer();

const animeRouter = express.Router();

// if the user want to access the reviews for an anime
animeRouter.use("/:animeId/reviews", reviewRouter);

animeRouter
  .route("/")
  .post(
    protect,
    restrictTo("admin"),
    upload.fields([{ name: "anime-thumbnail" }, { name: "anime-banner" }]),
    createAnime
  );

animeRouter
  .route("/:animeId")
  .get(getAnimeDetails)
  .patch(
    protect,
    restrictTo("admin"),
    upload.fields([{ name: "anime-thumbnail" }, { name: "anime-banner" }]),
    updateAnime
  );

module.exports = animeRouter;
