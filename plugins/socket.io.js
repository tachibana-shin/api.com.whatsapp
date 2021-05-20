const { userInToken, emitMyOnline } = require("../helpers/user");
const Chat = require("../models/Chat");

class Store {
  __state = {};
  set(key, value) {
    if (this.getKey(value) != null) {
      this.deleteKey(value);
    }
    this.__state[key] = value;
  }
  getKey(value) {
    for (const key in this.__state) {
      if (this.__state[key] === value) {
        return key;
      }
    }
  }
  get(key) {
    return this.__state[key];
  }
  deleteKey(value) {
    delete this.__state[this.getKey(value)];
  }
  delete(key) {
    delete this.__store[key];
  }
}

function sanitizeHTML(html) {
  return html.replace(/<|>/g, "\\<");
}

module.exports = (server) => {
  const { Server } = require("socket.io");
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
    cookie: true,
  });
  const storeId = new Store();
  const storeSubStateUser = Object.create(null);

  io.on("connection", (socket) => {
    let user = null;
    socket.on("auth", (token) => {
      try {
        if (token?.match(/^Bearer /)) {
          user = userInToken(token.replace(/^Bearer /, ""));
          storeId.set(socket.id, user._id);
        } else {
          throw new Error("AUTHORIZATION_NOT_FOUND");
        }
      } catch (e) {
        user = null;
        storeId.deleteKey(socket.id);
      }
    });
    socket.on("send message", async (body) => {
      if (user == null) {
        socket.emit("send message__ERROR", "INVALID_AUTH");
      } else {
        if (body && (!!body.content || !!body.image || !!body.file)) {
          let { id, content, image, file, uid } = body;

          if (content) {
            content = content.replace(/^\s+|\s+$/g, "");
          }

          const message = new Chat({
            from: user._id,
            to: id,
            message: {
              body: content,
            },
            readed: false,
            created: new Date(),
          });

          await message.save();
          socket.emit("send message__SUCCESS", { uid, _id: message._id });

          const sendToSocket = storeId.getKey(id);
          if (sendToSocket) {
            io.to(sendToSocket).emit("new message", {
              content: {
                body: content,
              },
              created: message.created,
              mysend: user._id === message.from,
              readed: false,
              sended: true,
              _id: message._id,
            });
          }
        } else {
          socket.emit("send message__ERROR", "BODY_UNDEFINED");
        }
      }
    });
    socket.on("my online", async () => {
      if (user) {
        const time = await emitMyOnline(user._id);

        io.to(storeSubStateUser[user._id] || []).emit("user online", {
          _id: user._id,
          lastOnline: time,
        });
      }
    });
    socket.on("subrice state user", (id) => {
      if (storeSubStateUser[id]?.find((item) => item === socket.id) == null) {
        storeSubStateUser[id] = [...(storeSubStateUser[id] || []), socket.id];
      }
    });
    socket.on("unsubrice state user", (id) => {
      storeSubStateUser[id] = storeSubStateUser[id]?.filter(
        (item) => item !== socket.id
      );

      if (!!storeSubStateUser[id]?.length) {
        delete storeSubStateUser[id];
      }
    });
  });
  io.on("disconnect", (socket) => {
    storeId.deleteKey(socket.id);
    for (const key in storeSubStateUser) {
      storeSubStateUser[key] = storeSubStateUser[key].filter(
        (item) => item !== socket.id
      );

      if (storeSubStateUser[key].length === 0) {
        delete storeSubStateUser[key];
      }
    }
  });
};
