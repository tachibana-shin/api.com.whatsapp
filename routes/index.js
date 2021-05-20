"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = void 0;
const get = (req, res) => {
    res.json({
        message: "Hello expressjs",
    });
};
exports.get = get;
