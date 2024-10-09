const HomePageSection = require("../models/homePageSectionModel");
const catchAsyncErrors = require("../util/catchAsyncErrors");
const CustomError = require("../util/CustomError");
const APIFeatures = require("../util/APIFeatures");

const createHomePageSection = catchAsyncErrors(async (req, res, next) => {
  const sectionData = req.body;

  // get the last document and add 1 to its order to get the order for this document
  const documents = await HomePageSection.find({}, { order: 1 })
    .sort("-order")
    .limit(1);

  sectionData.order = documents.length === 0 ? 1 : documents[0].order + 1;

  const section = await HomePageSection.create(sectionData);

  if (!section)
    return next(new CustomError(400, "Unable to create the section."));

  res.send({
    status: "success",
    data: {
      section,
    },
  });
});

const updateHomePageSection = catchAsyncErrors(async (req, res, next) => {
  const updates = req.body;
  const homeSectionId = req.params.homeSectionId;

  const updatedSection = await HomePageSection.findOne({
    _id: homeSectionId,
  }).populate("content.anime", "names thumbnail");

  if (!updatedSection)
    return next(
      new CustomError(500, "Section with the given id was not found.")
    );

  let otherSection;

  if (updates.order) {
    if (!updates.order.other)
      return next(
        new CustomError(
          400,
          "Please provide the details for the other section to swap order."
        )
      );

    otherSection = await HomePageSection.findOne({ _id: updates.order.other });

    if (!otherSection)
      return next(
        new CustomError(400, "Section with the given id was not found.")
      );

    let temp = otherSection.order;
    otherSection.order = updatedSection.order;
    updates.order = temp;
  }

  // non order updates
  for (const key in updates) updatedSection[key] = updates[key];

  await updatedSection.save();

  if (otherSection) await otherSection.save();

  res.send({
    status: "success",
    data: {
      updatedSection,
    },
  });
});

const deleteHomePageSection = catchAsyncErrors(async (req, res, next) => {
  const homeSectionId = req.params.homeSectionId;

  const { deletedCount } = await HomePageSection.deleteOne({
    _id: homeSectionId,
  });

  if (deletedCount === 0)
    return next(new CustomError(404, "Section not found."));

  res.status(204).send(null);
});

const getHomePageSections = catchAsyncErrors(async (req, res, next) => {
  const filter = HomePageSection.find({}).populate(
    req.query.populate || "",
    req.query.selectPopulate ? req.query.selectPopulate.replace(/,/g, " ") : ""
  );

  delete req.query.populate;
  delete req.query.selectPopulate;

  const apiFeatures = new APIFeatures(filter, req.query)
    .filter()
    .sort()
    .pagination()
    .limitFields();

  const sections = await apiFeatures.query;

  res.send({
    status: "success",
    results: sections.length,
    data: {
      sections,
    },
  });
});

const getAHomePageSection = catchAsyncErrors(async (req, res, next) => {
  const homeSectionId = req.params.homeSectionId;

  const section = await HomePageSection.findOne({ _id: homeSectionId });

  if (!section)
    return next(
      new CustomError(404, "Section with the given id was not found.")
    );

  res.send({
    status: "success",
    data: {
      section,
    },
  });
});

module.exports = {
  createHomePageSection,
  updateHomePageSection,
  deleteHomePageSection,
  getHomePageSections,
  getAHomePageSection,
};
