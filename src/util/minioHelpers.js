const sharp = require("sharp");
const { join } = require("path");
const Minio = require("minio");
const fs = require("fs/promises");

const uploadAnimeImagesToMinio = async (anime, animeId, imageType, file) => {
  // process the thumbnail

  // setting the extention based on banner or thumbnail
  const imageExtention = imageType === "anime_thumbnails" ? "jpeg" : "webp";

  const imageSavePath = join(
    __dirname,
    `../tempFiles/${imageType}/${animeId}.${imageExtention}`
  );

  const image = sharp(file.buffer);

  if (imageExtention === "jpeg") {
    await image
      .resize({
        width: 460,
        height: 650,
      })
      .jpeg()
      .toFile(imageSavePath);
  } else {
    await image
      .resize({
        width: 5120,
        height: 2880,
      })
      .webp()
      .toFile(imageSavePath);
  }

  // save the file to bucket
  const minioClient = new Minio.Client({
    endPoint: "127.0.0.1",
    port: 9000,
    useSSL: false,
    accessKey: process.env.MINIO_PROFILE_BUCKET_ACCESS_KEY,
    secretKey: process.env.MINIO_PROFILE_BUCKET_SECRET_KEY,
  });

  const bucketName = process.env.MINIO_PROFILE_BUCKET_NAME;

  if (anime[imageType === "anime_thumbnails" ? "thumbnail" : "banner"]) {
    // remove any existing image for this anime from the bucket
    await minioClient.removeObject(
      bucketName,
      `${imageType}/${animeId.toString()}.${imageExtention}`
    );
  }

  // save the new image to the bucket
  await minioClient.fPutObject(
    bucketName,
    `${imageType}/${animeId.toString()}.${imageExtention}`,
    imageSavePath
  );

  const url = `http://127.0.0.1:9000/${bucketName}/${imageType}/${animeId.toString()}.${imageExtention}`;

  // delete the temp thumbnail file
  await fs.rm(imageSavePath);

  return url;
};

module.exports = {
  uploadAnimeImagesToMinio,
};
