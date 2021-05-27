const mongoose = require("mongoose");

function minlength(prop, value) {
  return `${prop}_MIN_LENGTH_${value}`;
}
function maxlength(prop, value) {
  return `${prop}_MAX_LENGTH_${value}`;
}

const SChat = new mongoose.Schema({
  private: {
    type: Boolean,
    required: true,
    default: true,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: [true, "REQUIRED_CREATOR"],
  },
  "name-group": {
    type: String,
    trim: true,
    maxlength: [25, maxlength("GROUP", 25)],
    minlength: [1, minlength("GROUP", 1)],
    required() {
      if (this.private === false) {
        return [true, "REQUIRED_NAME_GROUP"];
      }
    },
  },
  "description-group": {
    type: String,
    trim: true,
    maxlength: [136, maxlength("GROUP", 136)],
    minlength: [1, minlength("GROUP", 1)],
    required() {
      if (this.private === false) {
        return [true, "REQUIRED_DES_GROUP"];
      }
    },
  },
  "avatar-group": {
    type: String,
    minlength: 1,
    maxlength: 500,
    required: false,
  },
  members: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    validate: {
      validator(value) {
        if (this.private) {
          if (value?.length === 2) {
            return true;
          }

          return false;
        }

        if (Array.isArray(value)) {
          if (value.length < 2) {
            return false;
          }

          return true;
        }

        return false;
      },
      message(value) {
        if (this.private) {
          if (value?.length !== 2) {
            return `PRIVATE_CHAT_REQUIRED_TWO_MEMBER`;
          }

          return false;
        }

        if (Array.isArray(value)) {
          if (value.length < 2) {
            return `GROUP_CHAT_REQUIRED_MIN_TWO_MEMBER`;
          }

          return false;
        }

        return `REQUIRED_TYPE_ARRAY<ID>`;
      },
    },
  },
  admins: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    default() {
      if (this.private === false) {
        return [];
      }

      return undefined;
    },
    required() {
      if (this.private === false) {
        return [true, "REQUIRED_ADMINS"];
      }
    },
  },
  messages: [
    {
      endorsed: {
        type: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
          },
        ],
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "MESSAGE_REQUIRED_SENDER"],
      },
      body: {
        content: {
          type: String,
          trim: true,
          required() {
            if (!this?.body?.file) {
              return [true, "MESSAGE_REQUIRED_FILE_OR_CONTENT"];
            }
          },
        },
        file: {
          src: {
            type: String,
            required() {
              if (!this?.body?.content) {
                return [true, "MESSAGE_REQUIRED_FILE_OR_CONTENT_SRC"];
              }
            },
          },
          name: {
            type: String,
            trim: true,
            required() {
              if (!this?.body?.content) {
                return [true, "MESSAGE_REQUIRED_FILE_OR_CONTENT_NAME"];
              }
            },
          },
          type: {
            type: String,
            trim: true,
            required() {
              if (!this?.body?.content) {
                return [true, "MESSAGE_REQUIRED_FILE_OR_CONTENT_TYPE"];
              }
            },
          },
          size: {
            type: Number,
            required() {
              if (!this?.body?.content) {
                return [true, "MESSAGE_REQUIRED_FILE_OR_CONTENT_SIZE"];
              }
            },
          },
          duration: {
            type: Number,
            required() {
              if (!this?.body?.content) {
                return [true, "MESSAGE_REQUIRED_FILE_OR_CONTENT_DUR"];
              }
            },
          },
          ratio: {
            type: Number,
            required() {
              if (this.messsages?.file.type.match(/(?:image|video)\//)) {
                return [true, "FILE_IMAGE_OR_VIDEO__REQUIRED_ASPECT_RATIO  "];
              }
            },
          },
        },
      },
      created: {
        type: Date,
        required: true,
        default: () => new Date(),
      },
    },
  ],
  created: {
    type: Date,
    required: true,
    default: () => new Date(),
  },
});

module.exports = mongoose.model("chat", SChat);
