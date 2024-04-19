const User = require("../models/userModel");
const CustomError = require("../util/CustomError");
const jwt = require("jsonwebtoken");
const catchAsyncErrors = require("../util/catchAsyncErrors");
const filterUserFields = require("../util/filterUserFields");

// return a signed token with token expiration time
const signToken = (_id) => {
  const token = jwt.sign({ _id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  return { token, tokenExpiration: Date.now() + +process.env.JWT_EXPIRES_IN };
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

const updateMyPassword = catchAsyncErrors(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword)
    return next(
      new CustomError(
        400,
        "The current password and the new password must be provided."
      )
    );

  // check if the current password provided is correct
  const isPasswordCorrect = await req.user.checkIsPasswordCorrect(
    currentPassword
  );

  if (!isPasswordCorrect)
    return next(new CustomError(400, "incorrect password provided."));

  // change the user password and save the user
  req.user.password = newPassword;
  req.user.confirmPassword = confirmPassword;

  const user = await req.user.save();

  // if the new password is saved with no error give the user a new auth token
  const token = signToken(user._id);

  res.json({
    status: "success",
    data: {
      user: filterUserFields(user),
      token,
    },
  });
});

// middleware for protected routes
const protect = catchAsyncErrors(async (req, res, next) => {
  // get the jwt token from the auth header
  const authHeader = req.headers.authorization || "";

  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer"))
    return next(
      new CustomError(401, "you need be logged in to access this resource.")
    );

  const token = authHeader.split(" ")[1];

  // verify if the auth token is valid and the token is not expired
  const tokenPayload = jwt.verify(token, process.env.JWT_SECRET);

  // get the user with the _id stored in token payload
  const user = await User.findById(tokenPayload._id).select("+password");

  if (!user)
    return new CustomError(
      401,
      "user associated with the give token was not found. please sign up."
    );

  // check if the password was changed since the jwt token was issued
  if (
    user.passwordChangedAt &&
    user.passwordChangedAt.getTime() > tokenPayload.iat * 1000
  ) {
    return next(
      new CustomError(
        401,
        "password was changed since this token was issued. please login again."
      )
    );
  }

  req.user = user;

  next();
});

const restrictTo = (...allowedRoutes) => {
  return (req, res, next) => {
    if (!allowedRoutes.includes(req.user.role))
      return next(
        new CustomError(403, "you do not have access to this resource.")
      );

    next();
  };
};

module.exports = {
  login,
  signup,
  protect,
  restrictTo,
  updateMyPassword,
};
