const filterUserFields = (
  user,
  allowedFields = ["username", "email", "role", "profilePicture"]
) => {
  const allowedFieldsUser = {};

  allowedFields.forEach((field) => (allowedFieldsUser[field] = user[field]));

  return allowedFieldsUser;
};

module.exports = filterUserFields;
