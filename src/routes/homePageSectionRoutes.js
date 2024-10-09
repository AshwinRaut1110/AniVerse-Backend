const express = require("express");
const { protect, restrictTo } = require("../controllers/authController");
const {
  getHomePageSections,
  createHomePageSection,
  updateHomePageSection,
  deleteHomePageSection,
  getAHomePageSection,
} = require("../controllers/homePageSectionController");

const homePageSectionRouter = express.Router();

homePageSectionRouter
  .route("/")
  .get(getHomePageSections)
  .post(protect, restrictTo("admin"), createHomePageSection);

homePageSectionRouter
  .route("/:homeSectionId")
  .get(getAHomePageSection)
  .patch(protect, restrictTo("admin"), updateHomePageSection)
  .delete(protect, restrictTo("admin"), deleteHomePageSection);

module.exports = homePageSectionRouter;
