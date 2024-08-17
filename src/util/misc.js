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

module.exports = {
  generateRandomString,
  runPromisified,
};
