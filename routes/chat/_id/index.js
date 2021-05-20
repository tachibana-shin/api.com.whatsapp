const Chat = require("../../../helpers/Chat");

exports.get = async ({ user, params: { id }, query: { beforeId } }, res) => {
  if (user == null) {
    res.status(400).json({
      message: "PLEASE_LOGIN",
    });
  } else {
    try {
      const conversation = await Chat.getConversation(user._id, id, beforeId);
      res.json(conversation);
    } catch (e) {
       console.log( e )
      res.status(e.statusCode || 502).json({
        message: e.message || "INVALID_CONVERSATION",
      });
    }
  }
};
