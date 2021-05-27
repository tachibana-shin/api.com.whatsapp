const { getChatOfList } = require("../../../helpers/chat");

exports.middleware = "auth-jwt";

exports.get = async ({ user, params: { id } }, res) => {
  const chat = await getChatOfList(user._id, id);

  if (chat) {
    res.json(chat);
  } else {
    res.status(404).end("Not Found");
  }
};
