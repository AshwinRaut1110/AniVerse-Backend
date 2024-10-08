const catchAsyncErrors = require("../util/catchAsyncErrors");
const { join } = require("path");
const fs = require("fs/promises");
const Anime = require("../models/animeModel");
const CustomError = require("../util/CustomError");
const { uploadAnimeImagesToMinio } = require("../util/minioHelpers");
const mongoose = require("mongoose");
const APIFeatures = require("../util/APIFeatures");
const { pagination, createMatch } = require("../util/misc");

const createAnime = catchAsyncErrors(async (req, res, next) => {
  const animeData = JSON.parse(req.body.animeData);

  // validate the data before proceeding with saving the files to the backend
  await Anime.validate(animeData);

  const animeId = new mongoose.Types.ObjectId();

  delete animeData.thumbnail;
  delete animeData.banner;

  // check if the anime thumbnail and banner were sent with the request if yes just save them to the bucket

  // save the thumbnail
  if (req.files["anime-thumbnail"]) {
    const animeThumbnail = req.files["anime-thumbnail"][0];

    try {
      animeData.thumbnail = await uploadAnimeImagesToMinio(
        animeData,
        animeId,
        "anime_thumbnails",
        animeThumbnail
      );
    } catch (e) {
      // if saving the thumbnail fails delete the temp file
      await fs.rm(
        join(__dirname, `../tempFiles/anime_thumbnails/${animeId}.jpeg`)
      );

      return next(new CustomError(400, "unable to to  save the thumbnail"));
    }
  }

  // save the banner
  if (req.files["anime-banner"]) {
    const animeBanner = req.files["anime-banner"][0];

    try {
      animeData.banner = await uploadAnimeImagesToMinio(
        animeData,
        animeId,
        "anime_banners",
        animeBanner
      );
    } catch (e) {
      // if saving the banner fails delete the temp file
      await fs.rm(
        join(__dirname, `../tempFiles/anime_banners/${animeId}.jpeg`)
      );

      return next(new CustomError(400, "unable to to save the banner"));
    }
  }

  animeData._id = animeId;

  const createdAnime = await Anime.create(animeData);

  if (!createdAnime)
    return next(new CustomError(400, "Unable to create the anime."));

  res.status(201).send({
    status: "success",
    data: {
      anime: createdAnime,
    },
  });
});

const updateAnime = catchAsyncErrors(async (req, res, next) => {
  const animeData = JSON.parse(req.body.animeData);

  // validate the data before proceeding with saving the files to the backend
  await Anime.validate(animeData);

  const animeId = req.params.animeId;

  if (!animeId) return next(new CustomError(400, "anime id must be provided."));

  // find the anime by id
  const anime = await Anime.findById(animeId);

  if (!anime)
    return next(new CustomError(404, "anime with the given id not found."));

  // check if the anime thumbnail and banner were sent with the request if yes just save them to the bucket

  // save the thumbnail
  if (req.files["anime-thumbnail"]) {
    const animeThumbnail = req.files["anime-thumbnail"][0];

    try {
      animeData.thumbnail = await uploadAnimeImagesToMinio(
        animeData,
        animeId,
        "anime_thumbnails",
        animeThumbnail
      );
    } catch (e) {
      // if saving the thumbnail fails delete the temp file
      await fs.rm(
        join(__dirname, `../tempFiles/anime_thumbnails/${animeId}.jpeg`)
      );

      return next(new CustomError(400, "unable to to  save the thumbnail"));
    }
  }

  // save the banner
  if (req.files["anime-banner"]) {
    const animeBanner = req.files["anime-banner"][0];

    try {
      animeData.banner = await uploadAnimeImagesToMinio(
        animeData,
        animeId,
        "anime_banners",
        animeBanner
      );
    } catch (e) {
      // if saving the banner fails delete the temp file
      await fs.rm(
        join(__dirname, `../tempFiles/anime_banners/${animeId}.jpeg`)
      );

      return next(new CustomError(400, "unable to to save the banner"));
    }
  }

  const illegalFields = [
    "_id",
    "ratingsQuantity",
    "averageRating",
    "thumbnail",
    "banner",
  ];

  // update the anime details
  for (const field in animeData) {
    if (illegalFields.includes(field)) continue;

    anime[field] = animeData[field];
  }

  const updatedAnime = await anime.save();

  if (!updatedAnime)
    return next(new CustomError(400, "Unable to update the anime."));

  res.send({
    status: "success",
    data: {
      anime: updatedAnime,
    },
  });
});

const getAnimeDetails = catchAsyncErrors(async (req, res, next) => {
  const animeId = req.params.animeId;

  if (!animeId) return next(new CustomError(400, "anime id must be provided."));

  const query = Anime.findById(animeId);

  if (req.query.populate) {
    query.populate({
      path: "relatedAnimes",
      populate: {
        path: "anime",
        select:
          "names averageRating ratingsQuantity description genres episodes status aired type thumbnail duration",
      },
    });
  }

  const anime = await query;

  if (!anime)
    return next(new CustomError(404, "anime with the provided id not found."));

  res.send({
    status: "success",
    data: {
      anime,
    },
  });
});

const getAnimes = catchAsyncErrors(async (req, res, next) => {
  const queryObject = req.body;

  const aggregationPipeline = [];

  // adding the search stage for filtering based on anime name
  if (queryObject.title) {
    if (queryObject.title.length < 3)
      return next(
        new CustomError(400, "the title must be atleast 3 characters long.")
      );

    aggregationPipeline.push({
      $search: {
        index: "default",
        compound: {
          should: [
            {
              autocomplete: {
                query: queryObject.title,
                path: "names.english",
              },
            },
            {
              autocomplete: {
                query: queryObject.title,
                path: "names.japanese",
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    });
  }

  // other filters, match stage
  if (queryObject.filter) {
    // console.log(createMatch(queryObject.filter));
    aggregationPipeline.push({ $match: createMatch(queryObject.filter) });
  }

  // page and limit
  if (queryObject.page || queryObject.limit) {
    const pagingData = pagination({
      page: queryObject.page,
      limit: queryObject.limit,
    });

    aggregationPipeline.push({
      $skip: pagingData.skip,
    });

    aggregationPipeline.push({
      $limit: pagingData.limit,
    });
  }

  // sort stage
  if (queryObject.sort) aggregationPipeline.push({ $sort: queryObject.sort });

  // project stage
  if (queryObject.project)
    aggregationPipeline.push({
      $project: queryObject.project,
    });

  const animes = await Anime.aggregate(aggregationPipeline);

  res.send({
    status: "success",
    results: animes.length,
    data: {
      animes,
    },
  });
});

module.exports = { createAnime, updateAnime, getAnimeDetails, getAnimes };
