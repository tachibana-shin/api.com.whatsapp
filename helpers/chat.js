const Chat = require("../models/Chat");
const mongoose = require("mongoose");

exports.getListChat = async (_id, start, limit = 20) => {
  _id = new mongoose.Types.ObjectId(_id + "");
  return await Chat.aggregate([
    {
      $match: {
        $or: [
          {
            from: _id,
          },
          {
            to: _id,
          },
        ],
      },
    },

    {
      $set: {
        for: {
          $cond: [
            {
              $eq: ["$from", _id],
            },
            "$to",
            "$from",
          ],
        },
      },
    },

    {
      $set: {
        for: {
          $toObjectId: "$for",
        },
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

    /// if array allow use syntax object not use []

    {
      $unwind: "$for",
    },

    {
      $sort: {
        created: -1,
      },
    },
    {
      $group: {
        _id: "$for._id",
        avatar: {
          $last: "$for.avatar",
        },
        name: {
          $last: "$for.name",
        },
        time: {
          $max: "$for.created",
        },
        count: {
          $sum: {
            $cond: [{ readed: "false" }, 1, 0],
          },
        },
        lastMess: {
          $first: "$message.body",
        },
      },
    },
  ])
    .sort({
      time: -1,
    })
    .skip(start)
    .limit(limit);
};

/*
 {
    $unwind: {
      path: "$messages",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    "$sort": {"messages.created": 1 }
  },
  {
    "$group": {
      "_id": "$_id",
      user1: { $first: "$user1" },
      user2: { $first: "$user2" },
      "messages": { "$push": "$messages" }
    }
  }
*/

exports.getConversation = async (userId, id, beforeId) => {
  userId = new mongoose.Types.ObjectId(userId + "");
  id = new mongoose.Types.ObjectId(id + "");
  const conversation = await Chat.aggregate([
    {
      $match: {
        $or: [
          {
            from: userId,
            to: id,
          },
          {
            from: id,
            to: userId,
          },
        ],
        ...(beforeId
          ? {
              _id: {
                $lt: mongoose.Types.ObjectId(beforeId),
              },
            }
          : {}),
      },
    },

    {
      $sort: {
        created: 1,
      },
    },

    {
      $limit: 20,
    },

    {
      $set: {
        for: {
          $cond: [
            {
              $eq: ["$from", id],
            },
            "$from",
            "$to",
          ],
        },
        mysend: {
          $cond: [{ $eq: ["$from", id] }, false, true],
        },
      },
    },

    {
      $set: {
        for: {
          $toObjectId: "$for",
        },
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

    /// if array allow use syntax object not use []

    {
      $unwind: "$for",
    },

    {
      $group: {
        _id: 1, //"$for._id",
        from: {
          $first: "$from",
        },
        name: {
          $first: "$for.name",
        },
        avatar: {
          $first: "$for.avatar",
        },
        lastOnline: {
          $first: "$for.lastOnline",
        },
        messages: {
          $push: {
            content: "$message",
            created: "$created",
            mysend: "$mysend",
            readed: "$readed",
            _id: "$_id",
            sended: true,
          },
        },
      },
    },
  ]);

  if (conversation.length === 1) {
    return conversation[0];
  } else {
    throw {
      statusCode: 404,
      message: "INVALID_CONVERSATION",
    };
  }
};
