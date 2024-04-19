const CustomError = require("../util/CustomError");

// for unique value errors
const handleUniqueFieldError = (err) => {
  const duplicateField = Object.entries(err.keyValue)[0];

  return new CustomError(
    400,
    `${duplicateField[0]} ${duplicateField[1]} is already taken, try something else.`
  );
};

// for handling mongoose validation error
const handleValidationError = (err) => {
  // multiple error messges are seperated by ; so they can be parsed easily
  const errorMessage = Object.values(err.errors)
    .map((e) =>
      e.name === "CastError"
        ? `invalid value provided for ${e.path}.`
        : e.message
    )
    .join(";");

  return new CustomError(400, errorMessage);
};

const handleInvalidJWTError = () => {
  return new CustomError(401, "invalid jwt token provided.");
};

const handleTokenExpiredError = () => {
  return new CustomError(
    401,
    "provided jwt token has expired. please login again."
  );
};

const sendDevError = (err, res) => {
  res.status(err.statusCode || 500).json({
    status: err.status || "error",
    err: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendProdError = (err, res) => {
  res.status(err.isOperational ? err.statusCode : 500).json({
    status: err.status || "error",
    message: err.isOperational ? err.message : "Something went wrong.",
  });

  if (!err.isOperational) console.log("ERROR", err);
};

const handleObjectIdCastError = () => {
  return new CustomError(400, "invalid id provided.");
};

const globalErrorController = (err, req, res, next) => {
  // limit the error info sent based on application environment
  if (process.env.environment === "DEV") {
    sendDevError(err, res);
  } else if (process.env.environment === "PROD") {
    if (err.code === 11000) err = handleUniqueFieldError(err);
    if (err.name === "ValidationError") err = handleValidationError(err);
    if (err.name === "JsonWebTokenError") err = handleInvalidJWTError();
    if (err.name === "TokenExpiredError") err = handleTokenExpiredError();
    if (err.name === "CastError" && err.kind === "ObjectId")
      err = handleObjectIdCastError();

    sendProdError(err, res);
  }
};

module.exports = globalErrorController;
