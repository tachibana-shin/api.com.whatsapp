exports.middleware = "auth-jwt";

exports.get = function get(req, res) {
  res.json({ user: req.user });
};
