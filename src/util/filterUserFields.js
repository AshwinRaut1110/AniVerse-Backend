const filterUserFields = (
  user,
  allowedFields = ["username", "email", "role", "profilePicture", "createdAt"]
) => {
  const allowedFieldsUser = {};

  allowedFields.forEach((field) => (allowedFieldsUser[field] = user[field]));

  return allowedFieldsUser;
};

module.exports = filterUserFields;
