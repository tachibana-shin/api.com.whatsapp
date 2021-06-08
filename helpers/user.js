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

  return !!user?.toJSON() ?? null;
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
  const user =
    (
      await User.findOne(
        {
          email,
          password,
        },
        "_id"
      )
    )?.toJSON() ?? null;
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
  } catch {
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
  return !!(await User.findOne({ _id: id }))?.toJSON() ?? null;
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
    (
      await User.findById(
        id,
        "name description phone avatar last-online is-online email"
      )
    )?.toJSON() ?? null
  );
};

exports.getHistorySearch = async (id) => {
  return (
    await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },

      {
        $set: {
          count: {
            $size: "$history-search",
          },
          "history-search": {
            $slice: ["$history-search", -8, 8],
          },
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "history-search",
          foreignField: "_id",
          as: "history-search",
        },
      },

      {
        $set: {
          "history-search": {
            $reverseArray: "$history-search",
          },
        },
      },

      {
        $set: {
          "history-search": {
            $map: {
              input: "$history-search",
              in: {
                _id: "$$this._id",
                name: "$$this.name",
                avatar: "$$this.avatar",
              },
            },
          },
        },
      },

      {
        $project: {
          count: "$count",
          "history-search": "$history-search",
        },
      },
    ])
  )[0];
};

exports.hintSearch = async (id) => {
  return await User.aggregate([
    {
      $match: {
        _id: {
          $ne: new mongoose.Types.ObjectId(id),
        },
      },
    },

    {
      $sort: {
        created: -1,
      },
    },

    {
      $limit: 33,
    },

    {
      $project: {
        _id: "$_id",
        name: "$name",
        avatar: "$avatar",
      },
    },
  ]);
};

exports.search = async (id, keyword, index = 0) => {
  return await User.find(
    {
      name: {
        $regex: new RegExp(
          keyword?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i"
        ),
      },
    },
    "_id name avatar"
  )
    .skip(index)
    .limit(20);
};

exports.addToHistory = async (id, id2) => {
  id = new mongoose.Types.ObjectId(id);
  id2 = new mongoose.Types.ObjectId(id2);

  await User.findByIdAndUpdate(id, {
    $pull: {
      "history-search": id2,
    },
  });
  await User.findByIdAndUpdate(id, {
    $push: {
      "history-search": id2,
    },
  });
};

exports.getFriends = async (id, lookup = false) => {
  return await Chat.aggregate([
    {
      $match: {
        private: true,
        members: {
          $in: [new mongoose.Type.ObjectId(id)],
        },
      },
    },

    {
      $set: {
        for: {
          $cond: {
            if: {
              $eq: [
                {
                  $arrayElemAt: ["$members", 0],
                },
                id,
              ],
            },
            then: {
              $arrayElemAt: ["$members", 1],
            },
            else: {
              $arrayElemAt: ["$members", 0],
            },
          },
        },
      },
    },

    ...(lookup
      ? [
          {
            $lookup: {
              from: "users",
              localField: "for",
              foreignField: "_id",
              as: "for",
            },
          },
          {
            $unwind: "$for",
          },
          {
            $set: {
              for: {
                name: "$for.name",
                avatar: "$for.avatar",
                "last-online": "$for.last-online",
                "is-online": "$for.is-online",
              },
            },
          },
        ]
      : []),

    {
      $replaceRoot: {
        replaceRoot: "$for",
      },
    },
  ]);
};

exports.isFriend = async (id, id2) => {
  id = new mongoose.Types.ObjectId(id);
  id2 = new mongoose.Types.ObjectId(id2);

  return await Chat.exists({
    memmbers: {
      $in: [id, id2],
    },
  });
};
