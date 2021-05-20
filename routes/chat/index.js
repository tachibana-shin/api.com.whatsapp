const { getListChat } = require("../../helpers/chat");

exports.get = async function get(req, res) {
  if (req.user == null) {
    res.status(400).json({
      message: "PLEASE_LOGIN",
    });
  } else {
    res.json(await getListChat(req.user._id, req.query.start || 0, 20));
  }
};
