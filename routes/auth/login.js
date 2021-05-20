const { login } = require("../../helpers/user");

exports.post = async function post(req, res) {
  try {
    const { user, token } = await login(req.body.email, req.body.password);
    res.json({ token });
  } catch (e) {
    res.status(403).json({
      message: e.message || "LOGIN_FAILED",
    });
  }
};
