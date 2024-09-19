const { run } = require("node-cmd");

const generateRandomString = (length) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

const runPromisified = (command) => {
  return new Promise((resolve, reject) => {
    run(command, function (err, data, stderr) {
      if (err) reject(err);
      else resolve({ data, stderr });
    });
  });
};

function pagination({ page, limit }) {
  // restrict the value of limit and page to be in a certain range
  if (limit) limit = +limit > 100 ? 100 : +limit;
  else limit = 5;

  if (page) page = +page >= 1 ? +page : 1;
  else page = 1;

  return { skip: limit * (page - 1), limit };
}

function createMatch(filter) {
  if (filter.premiered) {
    const premiered = { ...filter.premiered };
    delete filter.premiered;

    if (premiered.season) filter["premiered.season"] = premiered.season;
    if (premiered.year) filter["premiered.year"] = premiered.year;
  }

  // find animes in the range of start to end
  if (filter.aired) {
    const aired = { ...filter.aired };
    delete filter.aired;

    filter["aired.startDate"] = {};
    if (aired.start) filter["aired.startDate"]["$gte"] = new Date(aired.start);
    if (aired.end) filter["aired.startDate"]["$lte"] = new Date(aired.end);
  }

  if (filter.averageRating)
    filter.averageRating = {
      $gte: filter.averageRating,
    };

  // genres, studios and producers
  ["genres", "studios", "producers"].forEach((key) => {
    if (filter[key]) {
      filter[key] = { $in: filter[key] };
    }
  });

  // aggregationPipeline.push({ $match: match });
  return filter;
}

module.exports = {
  generateRandomString,
  runPromisified,
  pagination,
  createMatch,
};
