const mongoose = require("mongoose");

const SChat = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: [true, "REQUIRED_FROM_ID"],
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: [true, "REQUIRED_TO_ID"],
  },
  message: {
    body: {
      type: String
    },
    image: {
      type: String
    },
  },
  readed: {
    type: Boolean,
    required: true,
    default: false,
  },
  created: {
    type: Date,
    default: () => new Date(),
    required: true,
  },
});
SChat.statics.getMessagesNotRead = function (messages) {
  //@ts-ignore
  messages = (messages || []).reverse();
  const notRead = [];
  for (const mess of messages) {
    if (mess.readed === false) {
      notRead.push(mess);
    } else {
      break;
    }
  }
  return notRead;
};

module.exports = mongoose.model("chat", SChat);
