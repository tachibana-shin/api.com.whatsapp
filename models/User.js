const mongoose = require("mongoose");
const v4 = require("uuidv4");
const sha256 = require("sha256");

function minlength(prop, value) {
  return `${prop}_MIN_LENGTH_${value}`;
}
function maxlength(prop, value) {
  return `${prop}_MAX_LENGTH_${value}`;
}
function required(prop) {
  return `${prop}_REQUIRED`;
}
const SUser = new mongoose.Schema({
  // _id: String,
  name: {
    type: String,
    maxlength: [25, maxlength("USERNAME", 25)],
    minlength: [1, minlength("USERNAME", 1)],
    required: [true, required("USERNAME")],
    trim: true,
  },
  description: {
    type: String,
    minlength: [1, minlength("DESCRIPTION", 1)],
    maxlength: [139, maxlength("DESCRIPTION", 25)],
    required: [true, required("DESCRIPTION")],
    default: "I am using WhatsApp.",
    trim: true,
  },
  avatar: {
    type: String,
    minlength: 1,
    maxlength: 500,
    required: false,
    default: null,
  },
  // phone: {
  //   prephone: {
  //     type: Number,
  //     min: 1,
  //     max: 99,
  //     required: function () {
  //       return !(this as { email?: string }).email
  //         ? [true, "Prephone required please."]
  //         : false;
  //     },
  //   },
  //   serial: {
  //     type: String,
  //     minlength: 10,
  //     maxlength: [18, "Phone number serial maxium length 20."],
  //     required: function () {
  //       return !(this as { email?: string }).email
  //         ? [true, "Prephone required please."]
  //         : false;
  //     },
  //   },
  // },
  email: {
    type: String,
    validate(email) {
      const re =
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return [re.test(email.toLowerCase()), "EMAIL_INVALID"];
    },
    required: [true, "EMAIL_REQUIRED"],
    trim: true,
    lowercase: true,
  },
  uuid: {
    type: String,
    minlength: 32,
    maxlength: 32,
    validate: /[a-f0-9]/i,
    default() {
      return v4.uuid().replace(/-/g, "");
    },
    required: true,
  },
  password: {
    type: String,
    minlength: 64,
    maxlength: 64,
    validate: /[a-f0-9]/i,
    required: [true, "PASSWORD_REQUIRED"],
    set(value) {
      return sha256(value + "");
    },
  },
  created: {
    type: Date,
    required: true,
    default() {
      return new Date();
    },
  },
  lastOnline: {
    type: Date,
    required: true,
    default() {
      return new Date();
    },
  },
});

module.exports = mongoose.model("user", SUser);
