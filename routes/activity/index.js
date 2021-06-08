const { save, getList } = require("../../helpers/activity");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { uuid } = require("uuidv4");

exports.middleware = "auth-jwt";

exports.get = async ({ user }, res) => {
  const list = await getList(user._id);

  const indexMy = list.findIndex((item) => `${item._id}` === `${user._id}`);

  if (indexMy > -1) {
    res.json({
      i: list.splice(indexMy, 1)[0],
      other: list,
    });
  } else {
    res.json({
      other: list,
    });
  }
};

exports.post = [
  multer().single("photo"),
  async ({ user, body, file }, res) => {
    if (file) {
      if (/image\/*/.test(file.mimetype)) {
        const name = uuid() + path.extname(file.originalname);
        fs.writeFileSync(
          path.join(__dirname, "../../uploads", name),
          file.buffer
        );

        await save(user._id, {
          image: `http://localhost:3000/uploads/${name}`,
        });

        res.json({
          status: "success",
        });
      } else {
        res.status(501).end("FILE_NOT_IS_IMAGE");
      }
    } else {
      try {
        await save(user._id, body);
        res.json({
          status: "success",
        });
      } catch (e) {
        console.log(e);
        res.status(501).end("FAILED");
      }
    }
  },
];
