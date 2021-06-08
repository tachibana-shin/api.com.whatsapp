const User = require("../models/User");
const Chat = require("../models/Chat");
const mongoose = require("mongoose");
const { isFriend } = require("./user");
const { trim } = require("../utils");

exports.save = async (
  id,
  { image, content, "font-family": fontFamily, "background-color": bgColor }
) => {
  await User.findByIdAndUpdate(
    new mongoose.Types.ObjectId(id),
    {
      $push: {
        activitys: {
          body: {
            image,
            content: trim(content),
            "font-family": fontFamily,
            "background-color": bgColor,
          },
        },
      },
    },
    {
      runValidators: true,
      // new: true,
    }
  );
};

exports.getList = async (id, beforeId) => {
  return await Chat.aggregate([
    {
      $match: {
        private: true,
        members: {
          $in: [new mongoose.Types.ObjectId(id)],
        },
      },
    },

    {
      $unwind: "$members",
    },

    {
      $group: {
        _id: "$members",
        members: {
          $first: "$members",
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
      $unwind: "$members",
    },

    {
      $set: {
        "count-activity": {
          $size: "$members.activitys",
        },
      },
    },

    {
      $match: {
        $or: [
          {
            "members._id": new mongoose.Types.ObjectId(id),
          },
          {
            "count-activity": {
              $gt: 0,
            },
          },
        ],
      },
    },

    {
      $set: {
        "last-activity": {
          $arrayElemAt: ["$members.activitys", -1],
        },
      },
    },

    {
      $sort: {
        "last-activity.created": -1,
      },
    },

    ...(!!beforeId
      ? [
          {
            $match: {
              "members._id": {
                $lt: new mongoose.Types.ObjectId(beforeId),
              },
            },
          },
        ]
      : []),

    {
      $limit: 20,
    },

    {
      $set: {
        "last-activity_tmp": {
          $cond: [
            {
              $gt: ["$count-activity", 0],
            },
            {
              body: "$last-activity.body",
              created: "$last-activity.created",
              views: {
                $size: "$last-activity.viewer",
              },
            },
            null,
          ],
        },
      },
    },

    {
      $project: {
        _id: "$members._id",
        name: "$members.name",
        avatar: "$members.avatar",
        "last-online": "$members.last-online",
        "is-online": "$members.is-online",
        "count-activity": "$count-activity",
        "last-activity": "$last-activity_tmp",
      },
    },
  ]);
};

exports.getAllByUser = async (id, userId) => {
  id = new mongoose.Types.ObjectId(id);
  userId = new mongoose.Types.ObjectId(userId);

  return (
    (
      await Chat.aggregate([
        {
          $match: {
            private: true,
            $or: [
              {
                members: [id, userId],
              },
              {
                members: [userId, id],
              },
            ],
          },
        },

        {
          $limit: 1,
        },

        {
          $set: {
            for: userId,
          },
        },

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
            activitys: {
              $reverseArray: "$for.activitys",
            },
          },
        },

        {
          $set: {
            activitys: {
              $map: {
                input: "$activitys",
                in: {
                  body: "$$this.body",
                  created: "$$this.created",
                  views: {
                    $size: "$$this.viewer",
                  },
                },
              },
            },
          },
        },

        {
          $project: {
            _id: "$for._id",
            name: "$for.name",
            avatar: "$for.avatar",
            "last-online": "$for.last-online",
            "is-online": "$for.is-online",
            activitys: "$activitys",
          },
        },
      ])
    )[0] ?? null
  );
};

exports.getAllByMe = async (id) => {
  return (
    (
      await User.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(id),
          },
        },

        {
          $limit: 1,
        },

        {
          $set: {
            activitys: {
              $reverseArray: "$activitys",
            },
          },
        },

        {
          $set: {
            activitys: {
              $map: {
                input: "$activitys",
                in: {
                  body: "$$this.body",
                  created: "$$this.created",
                  views: {
                    $size: "$$this.viewer",
                  },
                },
              },
            },
          },
        },

        {
          $project: {
            _id: "$_id",
            name: "$name",
            avatar: "$avatar",
            "last-online": "$last-online",
            "is-online": "$is-online",
            activitys: "$activitys",
          },
        },
      ])
    )[0] ?? null
  );
};

exports.markAsRead = async (id, userId, activId) => {
  id = new mongoose.Types.ObjectId(id);
  userId = new mongoose.Types.ObjectId(userId);
  activId = new mongoose.Types.ObjectId(activId);

  if (`${id}` !== `${userId}` && (await isFriend(id, userId))) {
    await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          "activitys.$[activity].viewer": id,
        },
      },
      {
        multi: true,
        arrayFilters: [
          {
            "activity.viewer": {
              $nin: [id],
            },
          },
        ],
      }
    );

    return true;
  } else {
    return false;
  }
};
// this.getAllByUser("609b8202b5a389099cae3ce6", "609952c2b112741634d27d89");
