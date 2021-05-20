const User = require("../../helpers/user");

exports.post = async function post(req, res) {
  try {
    const token = await User.register(req.body);
    res.json({
      message: "SENDED_OTP",
      token,
    });
  } catch (e) {
    res.status(403).json({
      message: e.message || "REGISTER_FAILED",
    });
  }
};
