const fs = require("fs");
const path = require("path");

exports.get = ({ params }, res) => {
  const pathToFile = path.join(__dirname, "..", '..', "uploads", params[0]);
  if (fs.existsSync(pathToFile)) {
    res.sendFile(pathToFile);
  } else {
    res.status(404).end("Not Found");
  }
};
