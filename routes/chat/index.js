const { getListChat } = require("../../helpers/chat");

exports.middleware = "auth-jwt";

exports.get = async function get(req, res) {
  const list = await getListChat(req.user._id, req.query["before-id"]);

  res.json(list);
};
