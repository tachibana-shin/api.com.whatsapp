const { getPersonalGroup, getPersonal } = require("../../../helpers/personal");

exports.middleware = "auth-jwt";

exports.get = async (
  { user, params: { id }, query: { group = false } },
  res
) => {
  const personal = group
    ? await getPersonalGroup(user._id, id)
    : await getPersonal(user._id, id);

  if (personal) {
    res.json(personal);
  } else {
    res.status(404).end("Not Found");
  }
};
