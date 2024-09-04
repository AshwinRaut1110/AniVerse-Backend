const express = require("express");
const { join } = require("path");
const { protect, restrictTo } = require("../controllers/authController");
const {
  createEpisode,
  getAllEpisodes,
  getAnEpisode,
  updateEpisode,
  uploadAnEpisode,
  deleteAnEpisode,
} = require("../controllers/episodeController");
const multer = require("multer");
const { generateRandomString } = require("../util/misc");
const fs = require("fs/promises");
const commnetRouter = require("./commentRoutes");

const episodeRouter = express.Router({ mergeParams: true });

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const randomFolderName = generateRandomString(5);
    const folderPath = join(
      __dirname,
      `../tempFiles/videos/${randomFolderName}`
    );

    await fs.mkdir(folderPath);

    cb(null, folderPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

episodeRouter
  .route("/")
  .get(getAllEpisodes)
  .post(protect, restrictTo("admin"), createEpisode);

episodeRouter
  .route("/:episodeIdentifier")
  .get(getAnEpisode)
  .patch(protect, restrictTo("admin"), updateEpisode)
  .delete(protect, restrictTo("admin"), deleteAnEpisode);

episodeRouter
  .route("/upload/:episodeIdentifier")
  .post(
    protect,
    restrictTo("admin"),
    upload.single("episodeVideo"),
    uploadAnEpisode
  );

episodeRouter
  .route("/delete/:episodeIdentifier")
  .delete(protect, restrictTo("admin"), deleteAnEpisode);

episodeRouter.use("/:episodeId/comments", commnetRouter);

module.exports = episodeRouter;
