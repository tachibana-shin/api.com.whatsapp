const Chat = require("../models/Chat");
const User = require("../models/User");
const { existsUser } = require("./user");
const mongoose = require("mongoose");

exports.getListChat = async (id, beforeId) => {
  id = new mongoose.Types.ObjectId(id);

  const results = await Chat.aggregate([
    {
      $match: {
        $or: [
          {
            private: true,
            members: {
              $size: 2,
            },
          },
          {
            private: false,
            members: {
              $gt: ["$size", 1],
            },
          },
        ],
        members: {
          $elemMatch: {
            $eq: id,
          },
        },
      },
    },
    /* --------------------------------- @set: for -------------------------------- */
    {
      $set: {
        for: {
          $cond: {
            if: {
              $eq: ["$private", true],
            },
            then: {
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
            else: null,
          },
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

    {
      $set: {
        for: {
          $cond: {
            if: {
              $eq: ["$private", true],
            },
            then: "$for",
            else: [
              {
                _id: "$_id",
                name: "$name-group",
                avatar: "$avatar-group",
              },
            ],
          },
        },
      },
    },
    /* -------------------------------------------------------------------------- */

    /* --------------------------- @set count-members --------------------------- */
    {
      $set: {
        "count-members": {
          $size: "$members",
        },
      },
    },
    /* -------------------------------------------------------------------------- */
    /* -------------- add fields for message and @set last-message -------------- */
    {
      $set: {
        messages: {
          $map: {
            input: "$messages",
            in: {
              $mergeObjects: [
                "$$this",
                {
                  isend: {
                    $cond: [{ $eq: ["$$this.sender", id] }, true, false],
                  },
                },
                {
                  unread: {
                    $cond: {
                      if: {
                        $and: [
                          { $ne: ["$$this.sender", id] },
                          { $eq: [{ $in: [id, "$$this.endorsed"] }, false] },
                        ],
                      },
                      then: 1,
                      else: 0,
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },

    {
      $set: {
        "last-message": {
          $arrayElemAt: ["$messages", -1],
        },
        "unread-count": {
          $sum: "$messages.unread",
        },
      },
    },
    /* -------------------------------------------------------------------------- */
    {
      $unwind: "$for",
    },
    /* ---------------------------- group sort limit ---------------------------- */
    {
      $group: {
        _id: "$for._id",
        roomId: {
          $first: "$_id",
        },
        private: {
          $first: "$private",
        },
        for: {
          $first: "$for",
        },
        "count-members": {
          $first: "$count-members",
        },
        "unread-count": {
          $first: "$unread-count",
        },
        "last-message": {
          $first: "$last-message",
        },
        created: {
          $first: "$created",
        },
        creator: {
          $first: "$creator",
        },
        members: {
          $first: "$members",
        },
      },
    },

    {
      $limit: +process.env.LIMIT_COUNT_CHAT,
    },

    ...(!!beforeId && /[0-9a-z]{24}/.test(beforeId)
      ? [
          {
            $match: {
              _id: {
                $lt: new mongoose.Types.ObjectId(beforeId),
              },
            },
          },
        ]
      : []),
    /* -------------------------------------------------------------------------- */
    /* ------------------------- get information members ------------------------ */

    {
      $set: {
        members: {
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
        member: {
          _id: "$members._id",
          name: "$members.name",
          avatar: "$members.avatar",
          "is-online": "$members.is-online",
          "last-online": "$members.last-online",
          __v: "$members.__v",
        },
      },
    },

    {
      $group: {
        _id: "$_id",
        private: {
          $first: "$private",
        },
        roomId: {
          $first: "$roomId",
        },
        name: {
          $first: "$for.name",
        },
        avatar: {
          $first: "$for.avatar",
        },
        "unread-count": {
          $first: "$unread-count",
        },
        "count-members": {
          $first: "$count-members",
        },
        "last-message": {
          $first: "$last-message",
        },
        members: {
          $push: "$member",
        },
        created: {
          $first: "$created",
        },
        creator: {
          $first: "$creator",
        },
      },
    },

    {
      $set: {
        "last-update": {
          $max: ["$last-message.created", "$created"],
        },
      },
    },

    {
      $sort: {
        "last-update": -1,
      },
    },

    /* -------------------------------------------------------------------------- */
  ]);

  return results;
};

exports.getChatOfList = async (id, chatId) => {
  //// this is required chat id
  id = new mongoose.Types.ObjectId(id);
  chatId = new mongoose.Types.ObjectId(chatId);

  const results = await Chat.aggregate([
    {
      $match: {
        _id: chatId,
        members: {
          $elemMatch: {
            $eq: id,
          },
        },
      },
    },
    /* --------------------------------- @set: for -------------------------------- */
    {
      $set: {
        for: {
          $cond: {
            if: {
              $eq: ["$private", true],
            },
            then: {
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
            else: null,
          },
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

    {
      $set: {
        for: {
          $cond: {
            if: {
              $eq: ["$private", true],
            },
            then: "$for",
            else: [
              {
                _id: "$_id",
                name: "$name-group",
                avatar: "$avatar-group",
              },
            ],
          },
        },
      },
    },
    /* -------------------------------------------------------------------------- */

    /* --------------------------- @set count-members --------------------------- */
    {
      $set: {
        "count-members": {
          $size: "$members",
        },
      },
    },
    /* -------------------------------------------------------------------------- */
    /* -------------- add fields for message and @set last-message -------------- */
    {
      $set: {
        messages: {
          $map: {
            input: "$messages",
            in: {
              $mergeObjects: [
                "$$this",
                {
                  isend: {
                    $cond: [{ $eq: ["$$this.sender", id] }, true, false],
                  },
                },
                {
                  unread: {
                    $cond: {
                      if: {
                        $and: [
                          { $ne: ["$$this.sender", id] },
                          { $eq: [{ $in: [id, "$$this.endorsed"] }, false] },
                        ],
                      },
                      then: 1,
                      else: 0,
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },

    {
      $set: {
        "last-message": {
          $arrayElemAt: ["$messages", -1],
        },
        "unread-count": {
          $sum: "$messages.unread",
        },
      },
    },
    /* -------------------------------------------------------------------------- */
    {
      $unwind: "$for",
    },
    /* ---------------------------- group sort limit ---------------------------- */
    {
      $group: {
        _id: "$for._id",
        roomId: {
          $first: "$_id",
        },
        private: {
          $first: "$private",
        },
        for: {
          $first: "$for",
        },
        "count-members": {
          $first: "$count-members",
        },
        "unread-count": {
          $sum: "$messages.unread",
        },
        "last-message": {
          $first: "$last-message",
        },
        created: {
          $first: "$created",
        },
        creator: {
          $first: "$creator",
        },
        members: {
          $first: "$members",
        },
      },
    },

    /* -------------------------------------------------------------------------- */
    /* ------------------------- get information members ------------------------ */

    {
      $set: {
        members: {
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
        member: {
          _id: "$members._id",
          name: "$members.name",
          avatar: "$members.avatar",
          "is-online": "$members.is-online",
          "last-online": "$members.last-online",
          __v: "$members.__v",
        },
      },
    },

    {
      $group: {
        _id: "$_id",
        private: {
          $first: "$private",
        },
        roomId: {
          $first: "$roomId",
        },
        name: {
          $first: "$for.name",
        },
        avatar: {
          $first: "$for.avatar",
        },
        "unread-count": {
          $first: "$unread-count",
        },
        "count-members": {
          $first: "$count-members",
        },
        "last-message": {
          $first: "$last-message",
        },
        members: {
          $push: "$member",
        },
        created: {
          $first: "$created",
        },
        creator: {
          $first: "$creator",
        },
      },
    },

    /* -------------------------------------------------------------------------- */
  ]);

  switch (results.length) {
    case 0:
      return null;
    case 1:
      return results[0];
    default:
      console.warn(`Big Error! it in getChatOfList`);
      return results[0];
  }
};

exports.getInfoChat = async (id, chatId) => {
  id = new mongoose.Types.ObjectId(id);
  chatId = new mongoose.Types.ObjectId(chatId);

  const results = await Chat.aggregate([
    {
      $match: {
        // _id: chatId,
        $or: [
          {
            private: true,
            $or: [
              {
                members: [id, chatId],
              },
              {
                members: [chatId, id],
              },
            ],
          },
          {
            private: false,
            members: {
              $gt: ["$size", 1],
              $elemMatch: {
                $eq: id,
              },
            },
            _id: chatId,
          },
        ],
      },
    },

    {
      $set: {
        for: {
          $cond: {
            if: {
              $eq: ["$private", true],
            },
            then: {
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
            else: null,
          },
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

    {
      $set: {
        "count-members": {
          $size: "$members",
        },
      },
    },

    {
      $set: {
        for: {
          $cond: [
            { $eq: ["$private", true] },
            "$for", // $arrayElemAt: ["$for", 0]
            [
              {
                _id: "$_id",
                name: "$name-group",
                avatar: "$avatar-group",
              },
            ],
          ],
        },
      },
    },

    {
      $unwind: "$for",
    },

    {
      $group: {
        _id: "$for._id",
        roomId: {
          $first: "$_id",
        },
        members: {
          $first: "$members",
        },
        private: {
          $first: "$private",
        },
        name: {
          $first: "$for.name",
        },
        avatar: {
          $first: "$for.avatar",
        },
        "count-members": {
          $first: "$count-members",
        },
        creator: {
          $first: "$creator",
        },
      },
    },

    {
      $set: {
        members: {
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
        member: {
          _id: "$members._id",
          name: "$members.name",
          avatar: "$members.avatar",
          "is-online": "$members.is-online",
          "last-online": "$members.last-online",
          __v: "$members.__v",
        },
      },
    },

    {
      $group: {
        _id: "$_id",
        roomId: {
          $first: "$roomId",
        },
        members: {
          $push: "$member",
        },
        private: {
          $first: "$private",
        },
        name: {
          $first: "$name",
        },
        avatar: {
          $first: "$avatar",
        },
        "count-members": {
          $first: "$count-members",
        },

        creator: {
          $first: "$creator",
        },
      },
    },
  ]);

  return results[0];
};

exports.getChat = async (id, chatId, beforeId) => {
  id = new mongoose.Types.ObjectId(id);
  chatId = new mongoose.Types.ObjectId(chatId);

  const results = await Chat.aggregate([
    {
      $match: {
        // _id: chatId,
        $or: [
          {
            private: true,
            $or: [
              {
                members: [id, chatId],
              },
              {
                members: [chatId, id],
              },
            ],
          },
          {
            private: false,
            members: {
              $gt: ["$size", 1],
              $elemMatch: {
                $eq: id,
              },
            },
            _id: chatId,
          },
        ],
      },
    },

    {
      $set: {
        for: {
          $cond: {
            if: {
              $eq: ["$private", true],
            },
            then: {
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
            else: null,
          },
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

    {
      $set: {
        "count-members": {
          $size: "$members",
        },
      },
    },

    {
      $set: {
        for: {
          $cond: [
            { $eq: ["$private", true] },
            "$for", // $arrayElemAt: ["$for", 0]
            [
              {
                _id: "$_id",
                name: "$name-group",
                avatar: "$avatar-group",
              },
            ],
          ],
        },
      },
    },

    {
      $unwind: "$for",
    },

    {
      $set: {
        emptyMessage: {
          $cond: {
            if: {
              $eq: [{ $size: "$messages" }, 0],
            },
            then: true,
            else: false,
          },
        },
        messages: {
          $cond: {
            if: {
              $eq: [{ $size: "$messages" }, 0],
            },
            then: [{}],
            else: "$messages",
          },
        },
      },
    },

    {
      $unwind: {
        path: "$messages",
      },
    },

    {
      $sort: {
        "messages._id": -1,
      },
    },

    ...(!!beforeId && /[0-9a-z]{24}/.test(beforeId)
      ? [
          {
            $match: {
              "messages._id": {
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
      $sort: {
        "messages._id": 1,
      },
    },

    {
      $set: {
        "messages.isend": {
          $cond: [{ $eq: ["$messages.sender", id] }, true, false],
        },
      },
    },

    {
      $group: {
        _id: "$for._id",
        roomId: {
          $first: "$_id",
        },
        members: {
          $first: "$members",
        },
        private: {
          $first: "$private",
        },
        name: {
          $first: "$for.name",
        },
        avatar: {
          $first: "$for.avatar",
        },
        "count-members": {
          $first: "$count-members",
        },
        messages: {
          $push: {
            _id: "$messages._id",
            endorsed: "$messages.endorsed",
            body: "$messages.body",
            created: "$messages.created",
            isend: "$messages.isend",
            sender: "$messages.sender",
          },
        },
        emptyMessage: {
          $first: "$emptyMessage",
        },

        creator: {
          $first: "$creator",
        },
      },
    },

    {
      $set: {
        messages: {
          $cond: {
            if: { $eq: ["$emptyMessage", true] },
            then: [],
            else: "$messages",
          },
        },
        members: {
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
        member: {
          _id: "$members._id",
          name: "$members.name",
          avatar: "$members.avatar",
          "is-online": "$members.is-online",
          "last-online": "$members.last-online",
          __v: "$members.__v",
        },
      },
    },

    {
      $group: {
        _id: "$_id",
        roomId: {
          $first: "$roomId",
        },
        members: {
          $push: "$member",
        },
        private: {
          $first: "$private",
        },
        name: {
          $first: "$name",
        },
        avatar: {
          $first: "$avatar",
        },
        "count-members": {
          $first: "$count-members",
        },
        messages: {
          $first: "$messages",
        },
        creator: {
          $first: "$creator",
        },
      },
    },
  ]);

  if (results.length === 0) {
    const user =
      (
        await User.findOne({ _id: chatId }, "_id name avatar last-online")
      )?.toJSON() ?? null;

    if (user) {
      const { _id, name, avatar } = user;
      return {
        _id,
        roomId: _id,
        members: [],
        private: true,
        name,
        avatar,
        "count-members": 2,
        messages: [],
        creator: _id,
      };
    }
    const chat = await this.getInfoChat(id, chatId);

    if (chat) {
      return {
        ...chat,
        messages: [],
      };
    }

    return null;
  }

  return results[0];
};

exports.markAsRead = async (id, chatId, beforeId) => {
  id = new mongoose.Types.ObjectId(id);
  chatId = new mongoose.Types.ObjectId(chatId);
  beforeId = new mongoose.Types.ObjectId(beforeId);

  return await Chat.updateMany(
    {
      $or: [
        {
          private: true,
          $or: [
            {
              members: [id, chatId],
            },
            {
              members: [chatId, id],
            },
          ],
        },
        {
          private: false,
          _id: chatId,
          members: {
            $elemMatch: {
              $eq: id,
            },
          },
        },
      ],
    },
    {
      $push: {
        "messages.$[message].endorsed": id,
      },
    },
    {
      multi: true,
      arrayFilters: [
        {
          "message._id": {
            $lte: beforeId,
          },
          "message.sender": {
            $ne: id,
          },
          "message.endorsed": {
            $ne: id,
          },
        },
      ],
    }
  );
};

exports.saveMessage = async (id, chatId, body) => {
  id = new mongoose.Types.ObjectId(id);
  chatId = new mongoose.Types.ObjectId(chatId);
  /// updateOne == findOneAndUpdate
  const result =
    (
      await Chat.findOneAndUpdate(
        {
          $or: [
            {
              private: true,
              $or: [
                {
                  members: [id, chatId],
                },
                {
                  members: [chatId, id],
                },
              ],
            },
            {
              private: false,
              _id: chatId,
              members: {
                $elemMatch: {
                  $eq: id,
                },
              },
            },
          ],
        },
        {
          $push: {
            messages: {
              endorsed: [],
              sender: id,
              body,
            },
          },
        },
        {
          runValidators: true,
          new: true,
          projection: {
            members: 1,
            private: 1,
            messages: [
              {
                $arrayElemAt: ["$messages", -1],
              },
            ],
          },
        }
      )
    )?.toJSON() ?? null;

  if (result === null) {
    /// if not exists chat

    /// checking user exists

    if (await existsUser(chatId)) {
      ////// create chat
      const chat = new Chat({
        private: true,
        creator: id,
        members: [id, chatId],
        messages: [
          {
            endorsed: [],
            sender: id,
            body,
          },
        ],
      });

      await chat.save();
      result = {
        ...chat.learn(),
        new: true,
      };
    } else {
      ////// not found
      throw new Error("NOT_FOUND_CHAT");
    }
  }

  const {
    _id,
    members,
    new: isNew,
    messages: [message],
  } = result;

  return {
    _id,
    members,
    new: isNew || false,
    message: {
      _id: message._id,
      endorsed: message.endorsed,
      body: message.body,
      created: message.created,
      isend: `${message.sender}` === `${id}`,
      sender: `${message.sender}`,
    },
  };
};

exports.getMembers = async (id, chatId) => {
  id = new mongoose.Types.ObjectId(id);
  chatId = new mongoose.Types.ObjectId(chatId);

  const results =
    (
      await Chat.findOne(
        {
          $or: [
            {
              private: true,
              $or: [
                {
                  members: [id, chatId],
                },
                {
                  members: [chatId, id],
                },
              ],
            },
            {
              private: false,
              _id: chatId,
              members: {
                $elemMatch: {
                  $eq: id,
                },
              },
            },
          ],
        },
        "_id members"
      )
    )?.toJSON() ?? null;

  return {
    success: !!results,
    _id: results?._id,
    members: results?.members,
  };
};

exports.getMediaFiles = async (id, userId, beforeid, limit = 20) => {
  id = new mongoose.Types.ObjectId(id);
  userId = new mongoose.Types.ObjectId(userId);

  return await Chat.aggregate([
    {
      $match: {
        members: {
          $all: [id, userId],
        },
      },
    },
    {
      $unwind: "$messages",
    },
    {
      $match: {
        "messages.body.file": {
          $exists: true,
        },
        "messages.members": {
          $in: [userId],
        },
      },
    },
    {
      $sort: {
        "messages._id": -1,
      },
    },

    ...(!!beforeid
      ? [
          {
            $match: {
              "messages._id": {
                $lt: new mongoose.Types.ObjectId(beforeid),
              },
            },
          },
        ]
      : []),

    {
      $limit: limit,
    },

    {
      $project: {
        file: "$messages.body.file",
      },
    },
  ]);
};

exports.getListCommonGroup = async (id, userId) => {
  id = new mongoose.Types.ObjectId(id);
  userId = new mongoose.Types.ObjectId(userId);

  return await Chat.aggregate([
    {
      $match: {
        private: false,
        members: {
          $all: [id, userId],
        },
      },
    },

    {
      $set: {
        "count-members": {
          $size: "$members",
        },
        members: {
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
      },
    },

    {
      $project: {
        members: "$members",
        name: "$name-group",
        avatar: "$name-avatar",
        description: "$name-description",
        "count-members": "$count-members",
      },
    },
  ]);
};

exports.isOnNotify = async (id, chatId) => {
  id = new mongoose.Types.ObjectId(id);
  chatId = new mongoose.Types.ObjectId(chatId);
  return (
    await Chat.findOne(
      {
        $or: [
          {
            private: true,
            $or: [
              {
                members: [id, chatId],
              },
              {
                members: [chatId, id],
              },
            ],
          },
          {
            private: false,
            _id: chatId,
            members: {
              $elemMatch: {
                $eq: id,
              },
            },
          },
        ],
      },
      "notify"
    )
  )?.toJSON()?.notify;
};

exports.turnOnNotify = async (id, chatId) => {
  id = new mongoose.Types.ObjectId(id);
  chatId = new mongoose.Types.ObjectId(chatId);

  await Chat.updateOne(
    {
      $or: [
        {
          private: true,
          $or: [
            {
              members: [id, chatId],
            },
            {
              members: [chatId, id],
            },
          ],
        },
        {
          private: false,
          _id: chatId,
          members: {
            $elemMatch: {
              $eq: id,
            },
          },
        },
      ],
    },
    {
      notify: true,
    }
  );
};

exports.turnOffNotify = async (id, chatId) => {
  id = new mongoose.Types.ObjectId(id);
  chatId = new mongoose.Types.ObjectId(chatId);

  await Chat.updateOne(
    {
      $or: [
        {
          private: true,
          $or: [
            {
              members: [id, chatId],
            },
            {
              members: [chatId, id],
            },
          ],
        },
        {
          private: false,
          _id: chatId,
          members: {
            $elemMatch: {
              $eq: id,
            },
          },
        },
      ],
    },
    {
      notify: false,
    }
  );
};

exports.toggleNotify = async (id, chatId) => {
  if (await this.isOnNotify(id, chatId)) {
    await this.turnOffNotify(id, chatId);
  } else {
    await this.turnOnNotify(id, chatId);
  }
};
// !(async () => {
//   try {
//     console.log(
//       await exports.getListCommonGroup(
//         "609b8202b5a389099cae3ce6",
//         "609952c2b112741634d27d89"
//       )
//     );
//   } catch (err) {
//     console.log(err);
//   }
// })();
