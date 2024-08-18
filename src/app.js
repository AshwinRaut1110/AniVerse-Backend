const express = require("express");
const userRouter = require("./routes/userRoutes");
const animeRouter = require("./routes/animeRoutes");
const globalErrorController = require("./controllers/globalErrorController");
const cors = require("cors");
const reviewRouter = require("./routes/reviewRoutes");
const episodeRouter = require("./routes/episodeRoutes");
const commnetRouter = require("./routes/commentRoutes");
const { watchlistRouter } = require("./routes/watchlistRoutes");

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/v1/users", userRouter);
app.use("/api/v1/animes", animeRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/episodes", episodeRouter);
app.use("/api/v1/comments", commnetRouter);
app.use("/api/v1/watchlist", watchlistRouter);

app.all("*", (req, res) => {
  res.status(404).json({
    status: "fail",
    message: `the endpoint ${req.originalUrl} does not exist on this server.`,
  });
});

app.use(globalErrorController);

module.exports = app;
