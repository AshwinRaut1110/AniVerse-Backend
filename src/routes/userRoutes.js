const express = require("express");
const {
  login,
  signup,
  protect,
  restrictTo,
  updateMyPassword,
} = require("../controllers/authController");

const userRouter = express.Router();

// user authentication routes
userRouter.route("/login").post(login);
userRouter.route("/signup").post(signup);

// protected routes
userRouter.route("/update-my-password").patch(protect, updateMyPassword);

module.exports = userRouter;
