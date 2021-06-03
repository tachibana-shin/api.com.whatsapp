const { userInToken, emitMyOnline } = require("../helpers/user");
const { uuid: uuidv4 } = require("uuidv4");
const path = require("path");
const { Server } = require("socket.io");
const socketIOFile = require("socket.io-file");
const ImageSize = require("image-size");
const ffprobe = require("ffprobe");
const ffprobeStatic = require("ffprobe-static");
const {
  getIdRoom,
  saveMessage,
  markAsRead,
  getMembers,
} = require("../helpers/chat");

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
    cookie: true,
  });
  const bookClients = new Map();

  function getSocker(ids = [], id) {
    return ids
      .map((item) => bookClients.get(`${item}`))
      .filter((item) => item !== id && item != null);
  }

  io.on("connection", (socket) => {
    socket.state = new Proxy(
      {
        user: null,
        rooms: {},
      },
      {
        async set(target, prop, value) {
          if (prop === "user") {
            if (value != null) {
              target[prop] = value;
              emitMyOnline(value._id, true);
              bookClients.set(value._id + "", socket.id);
              io.emit("i online", value._id);
              return 0x0;
            }
            if (value == null && target[prop]) {
              /// callback user leave
              const lastTime = new Date();
              emitMyOnline(target[prop]._id, lastTime);
              emitMyOnline(target[prop]._id, false);
              bookClients.delete(target[prop]._id + "");
              io.emit("i offline", target[prop]._id, lastTime);
              console.log(`emit i offline`);
            }
          }
          target[prop] = value;
        },
      }
    );

    const uploader = new socketIOFile(socket, {
      // uploadDir: {			// multiple directories
      // 	music: 'data/music',
      // 	document: 'data/document'
      // },
      uploadDir: "uploads", // simple directory
      // accepts: ["*/*"], //['audio/mpeg', 'audio/mp3'],		// chrome and some of browsers checking mp3 as 'audio/mp3', not 'audio/mpeg'
      maxFileSize: 100000000, //4194304, 						// 4 MB. default is undefined(no limit)
      chunkSize: 10240, // default is 10240(1KB)
      transmissionDelay: 0, // delay of each transmission, higher value saves more cpu resources, lower upload speed. default is 0(no delay)
      overwrite: true, // overwrite file if exists, default is true.
      rename(filename, fileInfo) {
        const file = path.parse(filename);
        const fname = file.name;
        const ext = file.ext;
        return `${fname}_${uuidv4()}${ext}`;
      },
    });

    uploader.on("start", (fileInfo) => {
      console.log("Start uploading");
      console.log(fileInfo);

      if (socket.state.user == null) {
        io.to(socket.id).emit("send message__ERROR", "INVALID_AUTH");
        uploader.destroy();
        uploader.socket = socket;
      }
    });
    uploader.on("stream", (fileInfo) => {
      console.log(`${fileInfo.wrote} / ${fileInfo.size} byte(s)`);
    });
    uploader.on("complete", async (fileInfo) => {
      console.log("Upload Complete.");
      console.log(fileInfo);

      try {
        const src = `http://localhost:3000/uploads/${fileInfo.name}`;

        let { _id, uid } = fileInfo.data;
        const { originalFileName: name, mime: type, size } = fileInfo;
        const pathLocalToFile = path.join(
          __dirname,
          "..",
          "uploads",
          fileInfo.name
        );

        let ratio, duration;

        if (type.match(/image\//)) {
          /// image
          const { width, height } = ImageSize(pathLocalToFile);

          ratio = width / height;
        } else if (type.match(/video\//)) {
          /// videoy

          const ffInfo = await ffprobe(pathLocalToFile, {
            path: ffprobeStatic.path,
          });

          const { width, height } = ffInfo.streams[0];

          ratio = width / height;
          duration = parseFloat(ffInfo.streams[0].duration);
        }

        if (type.match(/audio\//)) {
          const ffInfo = await ffprobe(pathLocalToFile, {
            path: ffprobeStatic.path,
          });

          duration = parseFloat(ffInfo.streams[0].duration);
        }

        const result = await saveMessage(socket.state.user._id, _id, {
          file: {
            src,
            name,
            type,
            size,
            ...(ratio ? { ratio } : {}),
            ...(duration ? { duration } : {}),
          },
        });

        io.to(socket.id).emit(
          "send message__SUCCESS",
          _id,
          uid,
          result.message._id
        );

        if (result.new) {
          io.to(socket.id).emit("created chat", _id, result._id);
        }

        const sockets = getSocker(result.members, socket.id);

        if (sockets.length > 0) {
          io.to(sockets).emit("new message", result._id, {
            ...result.message,
            isend: false,
          });
        }
      } catch (e) {
        console.log(e);
        io.to(socket.id).emit("send message__SUCCESS", "ERROR_FORMAT_FILE");
      }
    });
    uploader.on("error", (err) => {
      console.log("Error!", err);

      io.to(socket.id).emit("send message__ERROR", "UNKNOWN_ERROR");
    });
    uploader.on("abort", (fileInfo) => {
      console.log("Aborted: ", fileInfo);

      io.to(socket.id).emit("send message__ERROR", "FILE_UPLOAD_CANCEL");
    });

    socket.on("disconnect", () => {
      socket.state.user = null;
      // delete socket.state;
    });
    socket.on("auth", (token) => {
      try {
        if (token?.match(/^Bearer /)) {
          socket.state.user = userInToken(token.replace(/^Bearer /, ""));
        } else {
          throw new Error("AUTHORIZATION_NOT_FOUND");
        }
      } catch (e) {
        socket.state.user = null;
      }

      console.log(`${socket.state.user?._id} logged`);
    });
    socket.on("send message", async (_id, message, uid) => {
      if (socket.state.user == null) {
        io.to(socket.id).emit("send message__ERROR", _id, "INVALID_AUTH");
      } else {
        try {
          message = message.replace(/^\s+|\s+$/g, "");

          const result = await saveMessage(socket.state.user._id, _id, {
            content: message,
          });

          io.to(socket.id).emit(
            "send message__SUCCESS",
            _id,
            uid,
            result.message._id
          );

          if (result.new) {
            io.to(socket.id).emit("created chat", _id, result._id);
          }

          const sockets = getSocker(result.members, socket.id);

          if (sockets.length > 0) {
            // if (result.new) {
            //   //// notify for all members of chat : new chat
            //   const chat = await getChatOfList(
            //     socket.state.user._id,
            //     result._id
            //   );
            //   await io.to(sockets).emit("new chat", chat);
            // }
            io.to(sockets).emit("new message", result._id, {
              ...result.message,
              isend: false,
            });
          }
        } catch (e) {
          console.log(e);
          io.to(socket.id).emit("send message__ERROR", _id);
        }
      }
    });
    socket.on("i read message", async (chatId, beforeId) => {
      if (socket.state.user) {
        const { _id, members, success } = await getMembers(
          socket.state.user._id,
          chatId
        );
        const { nModified } = await markAsRead(
          socket.state.user._id,
          chatId,
          beforeId
        );

        if (nModified > 0 && success) {
          const sockets = getSocker(members, socket.id);

          io.to([...sockets, socket.id]).emit(
            "read message",
            _id,
            socket.state.user._id,
            beforeId
          );
        }
      }
    });

    socket.on("focused", async (chatId) => {
      if (socket.state.user) {
        const { _id, members, success } = await getMembers(
          socket.state.user._id,
          chatId
        );

        if (success) {
          const sockets = getSocker(members, socket.id);

          if (sockets.length > 0) {
            io.to(sockets).emit("i focus", _id, socket.state.user._id);
          }
        }
      }
    });
    socket.on("blured", async (chatId) => {
      if (socket.state.user) {
        const { _id, members, success } = await getMembers(
          socket.state.user._id,
          chatId
        );

        if (success) {
          const sockets = getSocker(members, socket.id);

          if (sockets.length > 0) {
            io.to(sockets).emit("i blur", _id, socket.state.user._id);
          }
        }
      }
    });

    socket.on("join video call", async (chatId) => {
      const roomId = await getIdRoom(socket.state.user._id, chatId);

      if (roomId) {
        [...socket.rooms].forEach((room) => {
          if (room.match(/^video call/)) {
            socket.leave(room);
          }
        });

        socket.join(`video call ${roomId}`);
        socket
          .to(`video call ${roomId}`)
          .broadcast.emit("i join video call", chatId, socket.state.user._id);
      } else {
        io.to(socket.id).emit("join video call__ERROR", chatId, "NOT_FOUND");
      }
    });
  });
};
