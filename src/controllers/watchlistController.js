const Anime = require("../models/animeModel");
const User = require("../models/userModel");
const Watchlist = require("../models/watchlistModel");
const APIFeatures = require("../util/APIFeatures");
const catchAsyncErrors = require("../util/catchAsyncErrors");
const CustomError = require("../util/CustomError");
const { filterWatchlistFields } = require("../util/filterFields");

const statusMapping = {
  watching: "watching",
  "plan to watch": "planToWatch",
  completed: "completed",
  "on hold": "onHold",
  dropped: "dropped",
};

const getMyWatchlist = catchAsyncErrors(async (req, res, next) => {
  // delete the user property, ensuring that a user can't access lists from other users directly
  delete req.query.user;

  const filter = { user: req.user._id };

  const apiFeatures = new APIFeatures(Watchlist.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .pagination();

  const watchlistItems = await apiFeatures.query;

  res.send({
    status: "success",
    results: watchlistItems.length,
    data: {
      watchlistItems,
    },
  });
});

const getAWatchlist = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({ username: req.query.user });

  delete req.query.user;

  if (!user)
    return next(
      new CustomError(404, "User with the given username was not found.")
    );

  if (!user.profileIsPublic)
    return next(new CustomError(404, "The user's watchlist is not public."));

  const filter = { user: user._id };

  const apiFeatures = new APIFeatures(Watchlist.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .pagination();

  const watchlistItems = await apiFeatures.query;

  res.send({
    status: "success",
    results: watchlistItems.length,
    data: {
      watchlistItems,
    },
  });
});

const createWatchlistEntry = catchAsyncErrors(async (req, res, next) => {
  const watchlistData = req.body;

  const filteredWatchlistData = filterWatchlistFields(watchlistData);

  const anime = await Anime.findOne({ _id: filteredWatchlistData.anime });

  if (!anime)
    return next(new CustomError(404, "Anime with the given id not found."));

  // add all the required fields
  filteredWatchlistData.thumbnail = anime.thumbnail;
  filteredWatchlistData.user = req.user._id;
  filteredWatchlistData.title = anime.names.english;

  const createdWatchlistEntry = await Watchlist.create(filteredWatchlistData);

  if (!createdWatchlistEntry)
    return next(new CustomError(400, "Unable to create the watchlist entry."));

  const { episodes, duration } = anime;

  // update the user stats
  req.user.stats.watchlistStats.totalEntries++;
  req.user.stats.watchlistStats.watching++;

  await req.user.save();

  res.status(201).send({
    data: { createdWatchlistEntry },
  });
});

const updateAWatchlistEntry = catchAsyncErrors(async (req, res, next) => {
  const filteredUpdates = filterWatchlistFields(req.body, ["status"]);

  const watchlistEntry = await Watchlist.findOneAndUpdate(
    {
      user: req.user._id,
      _id: req.params.watchlistId,
    },
    filteredUpdates,
    { returnDocument: "before", runValidators: true }
  );

  if (!watchlistEntry)
    return next(
      new CustomError(404, "The entry with the given id does not exist.")
    );

  const anime = await Anime.findOne({ _id: watchlistEntry.anime });

  if (!anime)
    return next(new CustomError(404, "Anime with the given id not found."));

  const { episodes, duration } = anime;

  // updating the user stats
  const newStatus = statusMapping[req.body.status];
  const oldStatus = statusMapping[watchlistEntry.status];

  req.user.stats.watchlistStats[newStatus]++;
  req.user.stats.watchlistStats[oldStatus]--;

  // only change the episodesWatched and totalWatchTime when the status from to and from completed
  if (newStatus === "completed" && oldStatus !== "completed") {
    req.user.stats.watchlistStats.episodesWatched += episodes;
    req.user.stats.watchlistStats.totalWatchTime += episodes * duration;
  } else if (newStatus !== "completed" && oldStatus === "completed") {
    req.user.stats.watchlistStats.episodesWatched -= episodes;
    req.user.stats.watchlistStats.totalWatchTime -= episodes * duration;
  }

  await req.user.save();

  res.send({
    data: {
      watchlistEntry,
    },
  });
});

const deleteAWatchlistEntry = catchAsyncErrors(async (req, res, next) => {
  const watchlistEntry = await Watchlist.findOne({
    user: req.user._id,
    _id: req.params.watchlistId,
  }).populate("anime");

  if (!watchlistEntry)
    return next(
      new CustomError(404, "The entry with the given id does not exist.")
    );

  const { episodes, duration } = watchlistEntry.anime;
  const watchlistEntryStatus = watchlistEntry.status;

  const { deletedCount } = await watchlistEntry.deleteOne();

  if (!deletedCount)
    return next(
      new CustomError(404, "The entry with the given id does not exist.")
    );

  // update the user stats
  req.user.stats.watchlistStats.totalEntries--;

  if (watchlistEntryStatus === "completed") {
    req.user.stats.watchlistStats.episodesWatched -= episodes;
    req.user.stats.watchlistStats.totalWatchTime -= episodes * duration;
  }

  req.user.stats.watchlistStats[statusMapping[watchlistEntryStatus]]--;

  await req.user.save();

  res.status(204).send(null);
});

module.exports = {
  getMyWatchlist,
  createWatchlistEntry,
  getAWatchlist,
  updateAWatchlistEntry,
  deleteAWatchlistEntry,
};
