const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const cookie_parser = require("cookie-parser");
const express_import_routes = require("express-import-routes");
const dotenv = require("dotenv");
const db = require("./db");
const user = require("./helpers/user");
const User = require("./models/User");
const chalk = require("chalk");
const http = require("http");
const passport = require("passport");
const { ExpressPeerServer } = require("peer");
db.connect().then(async () => {
  console.log(chalk.blue("MongoDB connected!"));
  await User.updateMany(
    { "is-online": true },
    {
      $set: {
        "is-online": false,
      },
    }
  );
});
dotenv.config();
const app = express();
app.use(passport.initialize());
app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(cookie_parser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use((req, res, next) => {
  try {
    if (req.headers.authorization?.match(/^Bearer /)) {
      req.user = user.userInToken(
        req.headers.authorization.replace(/^Bearer /, "")
      );
    } else {
      throw new Error("AUTHORIZATION_NOT_FOUND");
    }
  } catch {
    req.user = null;
  }
  next();
});
app.use(require("./middleware/is-online"));
app.use(express_import_routes());
const server = http.createServer(app);
const peerServer = ExpressPeerServer(app, {
  debug: true,
});
app.use("/video-call", peerServer);
require("./plugins/socket.io")(server);
const PORT = +(process.env.PORT || 3000);
server.listen(PORT, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`⚡️ App it running on port ${PORT}`);
  }
});
exports = app;
