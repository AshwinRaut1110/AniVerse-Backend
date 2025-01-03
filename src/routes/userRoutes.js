const express = require("express");
const {
  login,
  signup,
  protect,
  updateMyPassword,
} = require("../controllers/authController");
const {
  updateMyProfilePicture,
  updateUserProfile,
  getMyStats,
  getAUsersStats,
} = require("../controllers/userController");
const multer = require("multer");

const upload = multer();

const userRouter = express.Router();

userRouter.route("/").patch(protect, updateUserProfile);

// user authentication routes
userRouter.route("/login").post(login);
userRouter.route("/signup").post(signup);

userRouter.route("/get-my-stats").get(protect, getMyStats);
userRouter.route("/stats").get(getAUsersStats);

// protected routes
userRouter.route("/update-my-password").patch(protect, updateMyPassword);
userRouter
  .route("/update-my-profile-pic")
  .patch(protect, upload.single("profile-pic"), updateMyProfilePicture);

module.exports = userRouter;
