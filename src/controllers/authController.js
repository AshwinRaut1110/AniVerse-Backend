const User = require("../models/userModel");
const CustomError = require("../util/CustomError");
const jwt = require("jsonwebtoken");
const catchAsyncErrors = require("../util/catchAsyncErrors");

// return a signed token with token expiration time
const signToken = (_id) => {
  const token = jwt.sign({ _id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  return { token, tokenExpiration: Date.now() + +process.env.JWT_EXPIRES_IN };
};

const filterUserFields = (user, allowedFields = ["username", "email"]) => {
  const allowedFieldsUser = {};

  allowedFields.forEach((field) => (allowedFieldsUser[field] = user[field]));

  return allowedFieldsUser;
};

const login = catchAsyncErrors(async (req, res, next) => {
  const { username, email, password } = req.body;

  // make sure atleast one of username or email is present
  if (!(username || email) || !password)
    return next(
      new CustomError(400, "username/email and password must be provided.")
    );

  // find the user by username/email
  const user = await User.findOne({ $or: [{ email }, { username }] }).select(
    "+password"
  );

  if (!user) return next(new CustomError(400, "invalid login credentials."));

  // if the user exists check if the password is correct
  const isPasswordCorrect = await user.checkIsPasswordCorrect(password);

  if (!isPasswordCorrect)
    return next(new CustomError(400, "invalid login credentials."));

  // if the password is correct, generate a jwt auth token
  const token = signToken(user._id);

  res.json({
    status: "success",
    data: {
      user: filterUserFields(user),
      token,
    },
  });
});

const signup = catchAsyncErrors(async (req, res, next) => {
  // create the new user
  const userData = {
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  };

  const user = await User.create(userData);

  if (!user)
    return next(new CustomError(400, "unable to create the user account"));

  // generate a jwt token for the new user
  const token = signToken(user._id);

  res.status(201).json({
    status: "success",
    data: {
      user: filterUserFields(user), // only return certain fields from the returned user
      token,
    },
  });
});

module.exports = {
  login,
  signup,
};
