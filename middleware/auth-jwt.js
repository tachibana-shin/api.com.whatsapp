const passport = require("passport");
const { Strategy, ExtractJwt } = require("passport-jwt");
const fs = require("fs");
const User = require("../models/User");

passport.use(
  new Strategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: fs.readFileSync(__dirname + "/../asc.private", "utf8"),
    },
    async (jwt_payload, done) => {
      try {
        const _id = jwt_payload?.data?._id;

        if (_id) {
          const user = (
            await User.findById(
              _id,
              "description avatar _id email name uuid created __v"
            )
          )?.toJSON();

          done(null, user);
        } else {
          throw new Error("INVALID_TOKEN");
        }
      } catch (err) {
        done(err, false, {
          message: "INVALID_AUTH",
        });
      }
    }
  )
);

module.exports = passport.authenticate("jwt", {
  session: false,
});
