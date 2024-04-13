const express = require("express");
const { login, signup } = require("../controllers/authController");

const userRouter = express.Router();

// user authentication routes
userRouter.route("/login").post(login);
userRouter.route("/signup").post(signup);

module.exports = userRouter;
