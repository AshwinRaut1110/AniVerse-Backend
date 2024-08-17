const express = require("express");
const { protect, restrictTo } = require("../controllers/authController");
const {
  createAnime,
  updateAnime,
  getAnimeDetails,
} = require("../controllers/animeController");

const multer = require("multer");
const reviewRouter = require("./reviewRoutes");
const episodeRouter = require("./episodeRoutes");

const upload = multer();

const animeRouter = express.Router();

// if the user want to access the reviews for an anime
animeRouter.use("/:animeId/reviews", reviewRouter);
animeRouter.use("/:animeId/episodes", episodeRouter);

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
