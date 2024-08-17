const sharp = require("sharp");
const { join } = require("path");
const Minio = require("minio");
const fs = require("fs/promises");
const { runPromisified, generateRandomString } = require("./misc");

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

  // remove any existing image for this anime from the bucket
  if (anime[imageType === "anime_thumbnails" ? "thumbnail" : "banner"]) {
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

// supported resolutions for the episode quality's
const qualityBandwidth = {
  360: {
    bandwidth: 800000,
    width: 640,
    height: 360,
  },
  480: {
    bandwidth: 1400000,
    width: 854,
    height: 480,
  },
  720: {
    bandwidth: 2000000,
    width: 1280,
    height: 720,
  },
};

const uploadEpisodeToMinio = async (file, episodeId, episode, quality) => {
  // setting up all required paths
  const mp4VideoPath = file.path;

  const hlsVideoPlaylistPath = join(
    file.destination,
    `${quality}/${quality}.m3u8`
  );

  const hlsVideoPlaylistFolder = join(file.destination, `${quality}`);

  const hlsVideoDestination = join(file.destination, `${quality}`);

  const masterPlaylistDestination = join(file.destination, "index.m3u8");

  const doesVersionAlreadyExist = episode.versions[quality];

  // convert the video into hls segments and generate a playlist manifest file
  await runPromisified(`ffmpeg -i "${mp4VideoPath}" -c:v copy -c:a copy -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${join(
    hlsVideoPlaylistFolder,
    quality + "_%03d.ts"
  )}" "${hlsVideoPlaylistPath}"
`);

  episode.versions[quality] = true;

  // create the updated master playlist file to minio
  await createMasterPlaylistFile(episode, masterPlaylistDestination);

  // delete the temporarily stored video
  await fs.rm(mp4VideoPath, { force: true });

  // delete any existing files for the given version of episode, if there are
  if (doesVersionAlreadyExist) {
    await deleteEpisodeFromMinio(episode, quality, true);
  }

  // upload the hls segments to minio bucket
  const minioClient = new Minio.Client({
    endPoint: "127.0.0.1",
    port: 9000,
    useSSL: false,
    accessKey: process.env.MINIO_PROFILE_BUCKET_ACCESS_KEY,
    secretKey: process.env.MINIO_PROFILE_BUCKET_SECRET_KEY,
  });

  const bucketName = process.env.MINIO_PROFILE_BUCKET_NAME;

  // get all the hls segment files from the video folder and upload them
  const files = await fs.readdir(hlsVideoDestination);

  for (const file of files) {
    const filePath = join(hlsVideoDestination, file);
    await minioClient.fPutObject(
      bucketName,
      `episodes/${episodeId}/${quality}/${file}`,
      filePath
    );
  }

  // upload the master playlist file
  await minioClient.fPutObject(
    bucketName,
    `episodes/${episodeId}/index.m3u8`,
    masterPlaylistDestination
  );

  // remove the temp video files
  await fs.rm(file.destination, { force: true, recursive: true });

  // add the link to the master playlist as the streaming link to the episode
  const url = `http://127.0.0.1:9000/${bucketName}/episodes/${episodeId}/index.m3u8`;

  return url;
};

const createMasterPlaylistFile = async (episode, masterPlaylistDestination) => {
  let command = `echo #EXTM3U > "${masterPlaylistDestination}" &&`,
    index = 0,
    allFalse = true;

  for (const key of Object.keys(episode.versions)) {
    const { bandwidth, width, height } = qualityBandwidth[+key];
    if (episode.versions[key]) {
      command += `${
        index !== 0 ? "&&" : ""
      } echo #EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${height} >> "${masterPlaylistDestination}" && echo ${key}/${key}.m3u8 >> "${masterPlaylistDestination}"`;
      index++;

      allFalse = false;
    }
  }

  // if none of the version are present
  if (allFalse) command = `echo #EXTM3U > "${masterPlaylistDestination}"`;

  // create a master playlist for episode
  await runPromisified(command);
};

const deleteEpisodeFromMinio = async (episode, quality, skip, deleteAll) => {
  const minioClient = new Minio.Client({
    endPoint: "127.0.0.1",
    port: 9000,
    useSSL: false,
    accessKey: process.env.MINIO_PROFILE_BUCKET_ACCESS_KEY,
    secretKey: process.env.MINIO_PROFILE_BUCKET_SECRET_KEY,
  });

  const bucketName = process.env.MINIO_PROFILE_BUCKET_NAME;

  var episodeSegmentsList = [];

  // getting the list of all the episode files from minio
  var stream = await minioClient.listObjects(
    bucketName,
    `episodes/${episode._id}/${quality}`,
    true
  );

  // if we are deleting the entire episode entry from the database delete the everything from the bucket as well
  if (deleteAll) {
    stream = await minioClient.listObjects(
      bucketName,
      `episodes/${episode._id}`,
      true
    );
  }

  stream.on("data", function (obj) {
    episodeSegmentsList.push(obj.name);
  });

  stream.on("end", async function (obj) {
    console.log(episodeSegmentsList);
    await minioClient.removeObjects(bucketName, episodeSegmentsList);

    // in case we are deleting the existing version file when uploading a new file for the same version no need to update the manifest file here since it'll be updated in the upload episode to minio part anyways
    if (skip) return;

    // update the master playlist file
    const folderName = join(
      __dirname,
      `../tempFiles/${generateRandomString(3)}`
    );

    const masterPlaylistDestination = join(folderName, `index.m3u8`);

    await fs.mkdir(folderName);

    await createMasterPlaylistFile(episode, masterPlaylistDestination);

    await minioClient.fPutObject(
      bucketName,
      `episodes/${episode._id}/index.m3u8`,
      masterPlaylistDestination
    );

    await fs.rm(folderName, { recursive: true, force: true });
  });

  stream.on("error", function (err) {
    throw err;
  });
};

module.exports = {
  uploadAnimeImagesToMinio,
  uploadEpisodeToMinio,
  deleteEpisodeFromMinio,
};
