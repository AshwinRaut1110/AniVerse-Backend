const filterUserFields = (
  user,
  allowedFields = [
    "username",
    "email",
    "role",
    "profilePicture",
    "createdAt",
    "Stats",
    "watchlistIsPublic",
  ]
) => {
  const allowedFieldsUser = {};

  allowedFields.forEach((field) => (allowedFieldsUser[field] = user[field]));

  return allowedFieldsUser;
};

const filterWatchlistFields = (watchlistData, allowedFields = ["anime"]) => {
  const allowedFieldsWatchlistData = {};

  allowedFields.forEach(
    (field) => (allowedFieldsWatchlistData[field] = watchlistData[field])
  );

  return allowedFieldsWatchlistData;
};

module.exports = {
  filterUserFields,
  filterWatchlistFields,
};
