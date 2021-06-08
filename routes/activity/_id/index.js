const { getAllByUser, getAllByMe } = require("../../../helpers/activity");

exports.middleware = "auth-jwt";

exports.get = async ({ user, params: { id } }, res) => {
  if (id === `${user._id}`) {
    res.json(await getAllByMe(user._id));
  } else {
    res.json(await getAllByUser(user._id, id));
  }
};
