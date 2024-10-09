const mongoose = require("mongoose");

const homePageSectionSchema = new mongoose.Schema({
  sectionType: {
    type: String,
    enum: {
      values: ["featured", "showcase", "spotlight"],
      message: "only featured | showcase | spotlight are allowed.",
    },
    required: true,
    trim: true,
    default: "showcase",
  },
  title: {
    type: String,
    trim: true,
  },
  subtitle: {
    type: String,
    trim: true,
  },
  content: {
    type: [
      {
        anime: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Anime",
          required: [true, "anime id for the content is required."],
        },
      },
    ],
  },
  order: {
    type: Number,
    required: true,
  },
});

// make sure that the title and subtitle are atleast 10 char long for showcase sections
homePageSectionSchema.pre("validate", function (next) {
  if (this.sectionType === "showcase") {
    if (!this.title || this.title.trim().length < 10) {
      this.invalidate("title", "Showcase title must have a length of >= 10.");
    }
    if (!this.subtitle || this.subtitle.trim().length < 10) {
      this.invalidate(
        "subtitle",
        "Showcase subtitle must have a length of >= 10."
      );
    }
  }

  next();
});

// make sure that the content is provided, is non empty and doesn't have duplicates
homePageSectionSchema.pre("validate", function (next) {
  if (!this.content || this.content.length === 0) {
    this.invalidate("content", "the content field must be a non-empty array.");
  }

  const animeSet = new Set();

  for (let i = 0; i < this.content.length; i++) {
    // Convert ObjectId to string for comparison
    let animeIdStr = this.content[i].anime._id.toString();

    if (animeSet.has(animeIdStr)) {
      this.invalidate(
        "content",
        "the content array must not contain duplicates."
      );
    }

    animeSet.add(animeIdStr);
  }

  next();
});

homePageSectionSchema.methods.toJSON = function () {
  const document = this.toObject();
  document.order = document.order.toString();

  return document;
};

const HomePageSection = mongoose.model(
  "homepagesection",
  homePageSectionSchema
);

module.exports = HomePageSection;
