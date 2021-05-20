const { emitMyOnline } = require("../helpers/User");

module.exports = async (req, res, next) => {
  if (req.user) {
    emitMyOnline(req.user._id);
  }

  next();
};
