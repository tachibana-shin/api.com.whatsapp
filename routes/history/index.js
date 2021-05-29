const { addToHistory } = require("../../helpers/user");

exports.middleware = "auth-jwt";

exports.put = async ({ user, body: { id } }, res) => {
  try {
    await addToHistory(user._id, id);
    res.json({
      status: "success",
    });
  } catch (err) {
    console.log(err);
    res.json({
      status: "error",
    });
  }
};
