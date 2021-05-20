const User = require("../../helpers/user");

exports.post = async function post(req, res) {
  try {
    if (await User.checkOTP(req.body.otp, req.body.token)) {
      res.json({
        message: "VERIFY_ACCOUNT_SUCCESS",
      });
    } else {
      throw new Error("VERIFY_ACCOUNT_FAILED");
    }
  } catch (e) {
    res.status(403).json({
      message: e.message || "TOKEN_INVALID",
    });
  }
};
