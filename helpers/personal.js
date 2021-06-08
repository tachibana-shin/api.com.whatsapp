const { Mongoose, Types } = require("mongoose");
const Chat = require("../models/Chat");
const { getMediaFiles, getListCommonGroup, isOnNotify } = require("./chat");
const { isBlocked, getCommonUser, existsUser } = require("./user");

exports.getPersonalUser = async (id, userId) => {
  if (await isBlocked(id, userId)) {
    return null;
  }

  if (await existsUser(userId)) {
    const [files, commonGroup, commonUser, notify] = await Promise.all([
      getMediaFiles(id, userId),
      getListCommonGroup(id, userId),
      getCommonUser(userId),
      isOnNotify(id, userId),
    ]);

    return {
      ...commonUser,
      files,
      commonGroup,
      "is-user": true,
      notify,
    };
  }

  return null;
};

exports.getPersonalGroup = async (id, groupId) => {
  id = new Types.ObjectId(id);
  groupId = new Types.ObjectId(groupId);

  const result = await Chat.aggregate([
    {
      $match: {
        _id: groupId,
        members: {
          $in: [id],
        },
      },
    },

    {
      $set: {
        "count-members": {
          $size: "$members",
        },
      },
    },

    {
      $set: {
        memberss: {
          $filter: {
            input: "$members",
            cond: {
              $ne: ["$$this", id],
            },
          },
        },
      },
    },

    {
      $set: {
        members: {
          $slice: ["$members", 0, 3],
        },
      },
    },

    {
      $set: {
        files: {
          $function: {
            body: function (files) {
              return {
                file: files.map((item) => item.body.file).filter(Boolean),
              };
            },
            args: ["$messages"],
            lang: "js",
          },
        },
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "members",
        foreignField: "_id",
        as: "members",
      },
    },

    {
      $set: {
        members: {
          $map: {
            input: "$members",
            in: {
              _id: "$$this._id",
              name: "$$this.name",
              avatar: "$$this.avatar",
              "is-online": "$$this.is-online",
              "last-online": "$$this.last-online",
              __v: "$$this.__v",
            },
          },
        },
        false: false,
      },
    },

    {
      $project: {
        name: "$name-group",
        avatar: "$avatar-group",
        description: "$description-group",
        members: "$members",
        files: "$files",
        created: "$created",
        creator: "$creator",
        "is-user": "$false",
        "count-members": "$count-members",
        notify: "$notify",
      },
    },
  ]);

  return result?.[0] ?? null;
};

exports.getPersonal = async (id, id2) => {
  const userPersonal = await this.getPersonalUser(id, id2);

  if (userPersonal) {
    return userPersonal;
  }

  return await this.getPersonalGroup(id, id2);
};

// !(async () => {
//   console.log(
//     await this.getPersonalGroup(
//       "609b8202b5a389099cae3ce6",
//       "60a9225cc6402b2fa41532a2"
//     )
//   );
// })();
