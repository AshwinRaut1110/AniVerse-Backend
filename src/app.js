const express = require("express");
const userRouter = require("./routes/userRoutes");
const globalErrorController = require("./controllers/globalErrorController");

const app = express();

app.use(express.json());

app.use("/api/v1/users", userRouter);

app.all("*", (req, res) => {
  res.status(404).json({
    status: "fail",
    message: `the endpoint ${req.originalUrl} does not exist on this server.`,
  });
});

app.use(globalErrorController);

module.exports = app;
