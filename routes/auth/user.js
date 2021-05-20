exports.get = function get(req, res) {
  if (req.user) {
    res.json({ user: req.user });
  } else {
    res.status(403).end("403");
  }
};
