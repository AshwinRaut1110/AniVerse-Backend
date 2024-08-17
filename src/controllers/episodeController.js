const CustomError = require("../util/CustomError");
const catchAsyncErrors = require("../util/catchAsyncErrors");
const fs = require("fs/promises");
const { join } = require("path");
const mongoose = require("mongoose");
const Episode = require("../models/episodeModel");
const Anime = require("../models/animeModel");
const {
  uploadEpisodeToMinio,
  deleteEpisodeFromMinio,
} = require("../util/minioHelpers");

const filterEpisodeUpdates = (episodeUpdates) => {
  const allowedUpdates = [
    "title",
    "episodeNumber",
    "description",
    "releasedAt",
  ];

  const updates = {};

  for (const field in episodeUpdates) {
    if (allowedUpdates.includes(field)) updates[field] = episodeUpdates[field];
  }

  return updates;
};

const setEpisodeUpdates = (episode, episodeUpdates) => {
  for (const field in episodeUpdates) {
    episode.set(field, episodeUpdates[field]);
  }

  return episode;
};

const getEpisodeFilter = (req) => {
  const filter = {};

  // allow the user to find the episode by its id or episode number
  if (mongoose.Types.ObjectId.isValid(req.params.episodeIdentifier))
    filter._id = { $eq: req.params.episodeIdentifier };
  else {
    req.params.episodeIdentifier = +req.params.episodeIdentifier;
    if (Number.isNaN(req.params.episodeIdentifier))
      return next(new CustomError(400, "invalid episode identifier provided."));

    filter.episodeNumber = { $eq: req.params.episodeIdentifier };
  }

  filter.anime = req.params.animeId;

  return filter;
};

const getAllEpisodes = catchAsyncErrors(async (req, res, next) => {
  if (!req.params.animeId)
    return next(new CustomError(400, "an anime id must be provided."));

  const episodes = await Episode.find({ anime: req.params.animeId });

  res.send({
    status: "success",
    results: episodes.length,
    data: {
      episodes,
    },
  });
});

const getAnEpisode = catchAsyncErrors(async (req, res, next) => {
  const filter = getEpisodeFilter(req);

  const episode = await Episode.findOne(filter);

  if (!episode) return next(new CustomError(404, "episode not found."));

  res.send({
    status: "success",
    data: {
      episode,
    },
  });
});

const createEpisode = catchAsyncErrors(async (req, res, next) => {
  if (!req.body)
    return next(new CustomError(400, "episode info must be provided."));

  const episodeData = req.body;

  episodeData.anime = req.params.animeId;

  const anime = await Anime.findById(req.params.animeId);

  if (!anime)
    return next(
      new CustomError(404, "The anime with the given id does not exist.")
    );

  episodeData.thumbnail = anime.banner;

  // save the episode in the database
  const createdEpisode = await Episode.create(episodeData);

  if (!createdEpisode)
    return next(new CustomError(500, "unable to save the episode."));

  res.status(201).send({
    data: {
      createdEpisode,
    },
  });
});

// update an episode
const updateEpisode = catchAsyncErrors(async (req, res, next) => {
  if (!req.body.episodeData && !req.file)
    return next(new CustomError(400, "episode info must be provided."));

  const filter = getEpisodeFilter(req);

  let episode = await Episode.findOne(filter);

  if (!episode) return next(new CustomError(404, "episode not found."));

  let episodeUpdates;

  // set the updates
  if (req.body.episodeData) {
    episodeUpdates = filterEpisodeUpdates(JSON.parse(req.body.episodeData));

    episode = setEpisodeUpdates(episode, episodeUpdates);

    await episode.validate();
  }

  const updatedEpisode = await episode.save();

  res.send({
    msg: "success",
    data: {
      episode: updatedEpisode,
    },
  });
});

const uploadAnEpisode = catchAsyncErrors(async (req, res, next) => {
  const filter = getEpisodeFilter(req);

  const episode = await Episode.findOne(filter);

  if (!episode)
    return next(
      new CustomError(404, "episode with the given identifier not found.")
    );

  // make temp dir for storing the episode files
  await fs.mkdir(join(req.file.destination, `./${req.query.variant || "360"}`));

  const url = await uploadEpisodeToMinio(
    req.file,
    episode._id,
    episode,
    req.query.variant || "360"
  );

  episode.streamLink = url;

  await episode.save();

  res.send(episode);
});

const deleteAnEpisode = catchAsyncErrors(async (req, res, next) => {
  const { quality } = req.query;

  const filter = getEpisodeFilter(req);

  const episode = await Episode.findOne(filter);

  if (!episode)
    return next(
      new CustomError(404, "Episode with the given identifier not found.")
    );

  // if the quality is provided only delete the specified version of the episode
  if (quality) {
    if (!["360", "480", "720"].includes(quality))
      return next(new CustomError(400, "Please provide a valid category"));

    if (!episode.versions[quality])
      return next(new CustomError(400, "The provided version does not exist."));

    episode.versions[quality] = false;

    await deleteEpisodeFromMinio(episode, quality);

    await episode.save();

    return res.status(204).send(null);
  }

  // if quality not provided then delete the DB episode entry along with all the version from minio
  for (const key in episode.versions) {
    if (episode.versions[key])
      await deleteEpisodeFromMinio(episode, quality, true, true);
  }

  await episode.deleteOne();

  res.status(204).send(null);
});

module.exports = {
  getAllEpisodes,
  createEpisode,
  getAnEpisode,
  updateEpisode,
  uploadAnEpisode,
  deleteAnEpisode,
};
