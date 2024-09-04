const mongoose = require("mongoose");
const { isAlphanumeric, isStrongPassword } = require("validator");
const { default: isEmail } = require("validator/lib/isEmail");
var bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
    required: [true, "username is required."],
    unique: [true, "username must be unique"],
    validate: [
      isAlphanumeric,
      "username can only contain alpha numeric characters",
    ],
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    required: [true, "email is required"],
    unique: true,
    validate: [isEmail, "please enter a valid email."],
  },
  role: {
    type: String,
    enum: {
      values: ["user", "admin"],
      message: `user role can only be "user" or "admin".`,
    },
    default: "user",
  },
  password: {
    type: String,
    trim: true,
    required: [true, "password is required."],
    validate: [isStrongPassword, "please enter a stronger password"],
    select: false,
  },
  confirmPassword: {
    type: String,
    trim: true,
    required: [true, "please confirm your password."],
    validate: {
      validator: function (value) {
        return this.password === value;
      },
      message: "the password must match confirm password",
    },
    select: false,
  },
  profilePicture: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  stats: {
    helpfulVotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    notHelpfulVotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    reviewsGiven: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentsMade: {
      type: Number,
      default: 0,
      min: 0,
    },
    watchlistStats: {
      watching: {
        type: Number,
        default: 0,
        min: 0,
      },
      planToWatch: {
        type: Number,
        default: 0,
        min: 0,
      },
      dropped: {
        type: Number,
        default: 0,
        min: 0,
      },
      completed: {
        type: Number,
        default: 0,
        min: 0,
      },
      onHold: {
        type: Number,
        default: 0,
        min: 0,
      },
      // meanRating: {
      //   type: Number,
      //   default: 0,
      //   min: 0,
      // },
      totalWatchTime: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalEntries: {
        type: Number,
        default: 0,
        min: 0,
      },
      episodesWatched: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  watchlistIsPublic: {
    type: Boolean,
    default: false,
  },
  passwordChangedAt: {
    type: Date,
  },
});

// hashing the user password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const hashedPassword = await bcrypt.hash(this.password, 12);

    this.password = hashedPassword;
    this.confirmPassword = undefined;
  }

  next();
});

// setting the passwordChangedAt field
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now - 5000;

  next();
});

userSchema.method("checkIsPasswordCorrect", async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
});

const User = mongoose.model("User", userSchema);

module.exports = User;
