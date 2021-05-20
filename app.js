const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const body_parser = require("body-parser");
const cookie_parser = require("cookie-parser");
const express_import_routes = require("express-import-routes");
const dotenv = require("dotenv");
const db = require("./db");
const user = require("./helpers/user");
const chalk = require("chalk");
const http = require("http");
db.connect().then(() => {
  console.log(chalk.blue("MongoDB connected!"));
});
dotenv.config();
const app = express();
app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(cookie_parser());
app.use(body_parser.urlencoded({ extended: true }));
app.use(body_parser.json());
app.use((req, res, next) => {
  try {
    if (req.headers.authorization?.match(/^Bearer /)) {
      req.user = user.userInToken(
        req.headers.authorization.replace(/^Bearer /, "")
      );
    } else {
      throw new Error("AUTHORIZATION_NOT_FOUND");
    }
  } catch (e) {
    req.user = null;
  }
  next();
});
app.use(require("./middleware/isOnline"));
app.use(express_import_routes());
const server = http.createServer(app);
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
