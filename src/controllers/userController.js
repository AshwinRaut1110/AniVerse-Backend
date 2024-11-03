const CustomError = require("../util/CustomError");
const catchAsyncErrors = require("../util/catchAsyncErrors");
const sharp = require("sharp");
const { join } = require("path");
const Minio = require("minio");
const { filterUserFields } = require("../util/filterFields");
const fs = require("fs/promises");
const User = require("../models/userModel");

const updateUserProfile = catchAsyncErrors(async (req, res, next) => {
  const filteredFields = filterUserFields(req.body, [
    "username",
    "email",
    "profileIsPublic",
  ]);

  for (const key in filteredFields) {
    if (filteredFields[key]) req.user[key] = filteredFields[key];
  }

  await req.user.save();

  res.json({
    status: "success",
    data: {
      user: filterUserFields(req.user),
    },
  });
});

const updateMyProfilePicture = catchAsyncErrors(async (req, res) => {
  const profilePicSavePath = join(
    __dirname,
    `../tempFiles/user_profile_pics/${req.user._id}.png`
  );

  // resizing the profile image and converting it to png format
  await sharp(req.file.buffer)
    .resize({ width: 350, height: 350 })
    .png()
    .toFile(profilePicSavePath);

  // save the image to the minio bucket
  const minioClient = new Minio.Client({
    endPoint: "127.0.0.1",
    port: 9000,
    useSSL: false,
    accessKey: process.env.MINIO_PROFILE_BUCKET_ACCESS_KEY,
    secretKey: process.env.MINIO_PROFILE_BUCKET_SECRET_KEY,
  });

  const bucketName = process.env.MINIO_PROFILE_BUCKET_NAME;

  // delete any existing profile pic from the bucket
  if (req.user.profilePicture) {
    await minioClient.removeObject(
      bucketName,
      `user_profile_pics/${req.user._id.toString()}.png`
    );
  }

  // save the new profile image to the bucket
  await minioClient.fPutObject(
    bucketName,
    `user_profile_pics/${req.user._id.toString()}.png`,
    profilePicSavePath
  );

  // update the user profile path url
  req.user.profilePicture = `http://127.0.0.1:9000/${bucketName}/user_profile_pics/${req.user._id.toString()}.png`;

  req.user.save({ validateBeforeSave: false });

  // remove the temp copy of the profile picture from the server
  await fs.rm(profilePicSavePath);

  res.json({
    status: "success",
    data: {
      user: filterUserFields(req.user),
    },
  });
});

const getMyStats = catchAsyncErrors(async (req, res, next) => {
  res.send({
    status: "success",
    data: {
      stats: req.user.stats,
    },
  });
});

const getAUsersStats = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({ username: req.query.user });

  if (!user)
    return next(
      new CustomError(404, "User with the given username not found.")
    );

  if (!user.profileIsPublic)
    return next(new CustomError(404, "The user's profile is not public."));

  res.send({
    status: "success",
    data: {
      stats: user.stats,
    },
  });
});

module.exports = {
  updateMyProfilePicture,
  updateUserProfile,
  getMyStats,
  getAUsersStats
};
