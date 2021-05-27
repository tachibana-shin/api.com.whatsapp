const { getChat } = require("../../../helpers/chat");

exports.middleware = "auth-jwt";

exports.get = async (
  { user, params: { id }, query: { "before-id": beforeId } },
  res
) => {
  const chat = await getChat(user._id, id, beforeId);

  if (chat) {
    res.json(chat);
  } else {
    res.status(402).end(`Not Found Chat ${id}`);
  }
};
