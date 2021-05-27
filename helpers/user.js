const fs = require("fs");
const nodemailer = require("nodemailer");
const jsonwebtoken = require("jsonwebtoken");
const User = require("../models/User");
const mongoose = require("mongoose");

const serceKey = fs.readFileSync(__dirname + "/../asc.private", "utf8");

function generateOTP() {
  let otp = "";
  for (let index = 0; index < 5; index++) {
    otp += Math.round(Math.random() * 9) + "";
  }
  return otp;
}

const transporter = nodemailer.createTransport({
  // config mail server
  service: "Gmail",
  auth: {
    user: "thanh.30.10a9@gmail.com",
    pass: "Thanhbanh",
  },
});

exports.existsEmail = async function (email) {
  const user = await User.findOne({ email });

  return !!user?.toJSON() || null;
};

exports.sendOTP = async function (params) {
  if (await exports.existsEmail(params.email)) {
    throw new Error(`EMAIL_EXISTS`);
  } else {
    const user = new User(params);

    const invalidate = user.validateSync();
    if (invalidate) {
      for (const key in invalidate.errors) {
        const { message } = invalidate.errors[key].properties;
        if (!!message) {
          throw new Error(message);
        }
      }
    }
    const otp = generateOTP();
    const token = jsonwebtoken.sign(
      {
        data: Object.assign(Object.assign({}, params), { otp }),
      },
      serceKey,
      { algorithm: "HS256", expiresIn: 1000 * 5 * 60 }
    );
    return await new Promise((resolve, reject) => {
      transporter.sendMail(
        {
          from: "Nguyễn Thành",
          to: params.email,
          subject: "Xác thực tài khoản",
          text: `You recieved OTP: ${otp}`,
        },
        function (err, info) {
          if (err) {
            console.log(err);
            reject(`EMAIL_OTP_SEND_FAILED`);
          } else {
            resolve(token);
          }
        }
      );
    });
  }
};

exports.checkOTP = async function (otp, token) {
  const decode = jsonwebtoken.verify(token, serceKey);

  if (decode.data.otp === otp) {
    if (await existsEmail(decode.data.email)) {
      throw new Error(`EMAIL_EXISTS`);
    } else {
      //@ts-ignore
      const user = new User.default(decode.data);
      await user.save();
      return true;
    }
  }
  return false;
};
exports.register = async function (params) {
  return await exports.sendOTP(params);
};

exports.login = async function (email, password) {
  const user = (
    await User.findOne(
      {
        email,
        password,
      },
      "_id"
    )
  )?.toJSON() || null;
  if (user) {
    return {
      user: user,
      token: jsonwebtoken.sign({ data: user }, serceKey, {
        algorithm: "HS256",
        expiresIn: 1000 * 60 * 60 * 24 * 30,
      }),
    };
  }
  throw new Error("LOGIN_FAILED");
};

exports.userInToken = function (token) {
  try {
    return jsonwebtoken.verify(token, serceKey).data;
  } catch (e) {
    throw new Error("TOKEN_INVALID");
  }
};

exports.emitMyOnline = async function (_id, date = new Date()) {
  if (typeof date === "boolean") {
    await User.updateOne({ _id }, { "is-online": date });
  } else {
    await User.updateOne({ _id }, { "last-online": date });
  }
  return date;
};

exports.existsUser = async (id) => {
  return !!(await User.findOne({ _id: id }))?.toJSON() || null;
};

exports.isBlocked = async (id, userId) => {
  id = new mongoose.Types.ObjectId(id);
  userId = new mongoose.Types.ObjectId(userId);

  if (
    await User.findOne(
      {
        _id: id,
        blocks: {
          $elemMatch: {
            $eq: userId,
          },
        },
      },
      "_id"
    )
  ) {
    return "ME";
  }

  if (
    await await User.findOne(
      {
        _id: userId,
        blocks: {
          $elemMatch: {
            $eq: id,
          },
        },
      },
      "_id"
    )
  ) {
    return "YOU";
  }

  return false;
};

exports.block = async (id, userId) => {
  id = new mongoose.Types.ObjectId(id);
  userId = new mongoose.Types.ObjectId(userId);

  if ((await this.isBlocked(id, userId)) === false) {
    await User.updateOne(
      {
        _id: id,
      },
      {
        $push: {
          blocks: userId,
        },
      }
    );
    return true;
  }

  return false;
};

exports.getCommonUser = async (id) => {
  return (
    await User.findById(
      id,
      "name description phone avatar last-online is-online"
    )
  )?.toJSON() || null;
};
// !(async () => {
//   console.log(await this.getCommonUser("609b8202b5a389099cae3ce6"));
// })();
