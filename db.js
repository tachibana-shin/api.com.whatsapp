const mongoose = require("mongoose");
function mergeOptions(options, defaults) {
  if (options === null || typeof options !== "object") {
    options = {
      sql: options,
    };
  }
  return Object.assign(Object.assign({}, defaults), options);
}

exports.connect = async (options) => {
  return await mongoose.connect(
    `mongodb://localhost:27017/com_whatsapp`,
    mergeOptions(options || {}, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    })
  );
};
