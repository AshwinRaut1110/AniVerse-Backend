const app = require("./app");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.DB_URL)
  .then(() => {
    console.log("successfully connected to the database.");
  })
  .catch((err) => {
    console.log("unable to connect to the database.");
    console.log(err.message);
  });

app.listen(PORT, () => {
  console.log(`Server listening on http://127.0.0.1:${PORT}`);
});
