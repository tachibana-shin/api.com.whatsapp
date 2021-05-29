const { getHistorySearch, hintSearch, search } = require("../../helpers/user");

exports.middleware = "auth-jwt";

exports.get = async ({ user, query: { query_result, start = 0 } }, res) => {
  if (!!query_result) {
    const list = await search(user._id, query_result, +start || 0);

    res.json(list);
  } else {
    const [history, hint] = await Promise.all([
      getHistorySearch(user._id),
      hintSearch(user._id),
    ]);

    res.json({
      history,
      hint,
    });
  }
};
