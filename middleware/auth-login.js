const passport = require("passport");
const { Strategy } = require("passport-local");
const { login } = require("../helpers/user");

passport.use(
  new Strategy(async (username, password, done) => {
    try {
      const { user, token } = await login(username, password);

      if (user) {
        done(null, user, { token: `${token}` });
      } else {
        throw new Error("LOGIN_FAILED");
      }
    } catch {
      done(null, false, {
        message: "INVALID_USERNAME_OR_PASSORD",
      });
    }
  })
);

module.exports = passport.authenticate("local", {
  failureFlash: true,
  session: false
  // failWithError: true
});
