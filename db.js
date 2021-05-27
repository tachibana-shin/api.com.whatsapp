const mongoose = require("mongoose");
// const cachegoose = require("cachegoose");

// cachegoose(mongoose, {
//   engine: "redis" /* If you don't specify the redis engine,      */,
//   port: 6379 /* the query results will be cached in memory. */,
//   host: "localhost",
// });

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
