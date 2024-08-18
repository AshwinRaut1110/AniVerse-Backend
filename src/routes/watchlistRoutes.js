const { Router } = require("express");
const { protect } = require("../controllers/authController");
const {
  getMyWatchlist,
  createWatchlistEntry,
  getAWatchlist,
  updateAWatchlistEntry,
  deleteAWatchlistEntry,
} = require("../controllers/watchlistController");

const watchlistRouter = Router();

watchlistRouter.route("/my-watchlist").get(protect, getMyWatchlist);

watchlistRouter
  .route("")
  .get(getAWatchlist)
  .post(protect, createWatchlistEntry);

watchlistRouter
  .route("/:watchlistId")
  .patch(protect, updateAWatchlistEntry)
  .delete(protect, deleteAWatchlistEntry);

module.exports = {
  watchlistRouter,
};
