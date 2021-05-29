const {
  isOnNotify,
  turnOnNotify,
  turnOffNotify,
  toggleNotify,
} = require("../../../helpers/chat");

exports.get = async ({ user, params: { id } }, res) => {
  res.json({
    notify: await isOnNotify(user._id, id),
  });
};

exports.put = async ({ user, params: { id }, body: { turn = true } }, res) => {
  try {
    if (typeof turn === "boolean") {
      if (turn) {
        await turnOnNotify(user._id, id);
      } else {
        await turnOffNotify(user._id, id);
      }
    } else {
      await toggleNotify(user._id, id);
    }

    res.status(200).json({ status: "success" });
  } catch (err) {
     console.log( err )
    res.status(500).json({ status: "error" });
  }
};
