const app = require("./app");
const http = require("http");
const dotenv = require("dotenv");
const { default: mongoose } = require("mongoose");

dotenv.config();
process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});
const { Server } = require("socket.io");
const User = require("./models/UserModel");
const FriendRequest = require("./models/friendRequest");
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const port = process.env.PORT || 8000;
const DB = process.env.DBURL.replace("<PASSWORD>", process.env.DBPASSWORD);

mongoose.set("strictQuery", false);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connect Db success!");
  })
  .catch((err) => {
    console.log(err);
  });
server.listen(port, () => {
  console.log(`server is running on ${port}`);
});
io.on("connection", async (socket) => {
  console.log(socket);
  // console.log(JSON.stringify(socket.handshake.query));
  const user_id = socket.handshake.query["user_id"];
  const socket_id = socket.id;
  console.log(`user connected ${socket_id}`);
  if (Boolean(user_id)) {
    await User.findByIdAndUpdate(user_id, { socket_id });
  }
  // write  our socket and event handlers
  socket.on("friendRequest", async (data, callback) => {
    console.log(data.to);
    const to_user = await User.findById(data.to).select("socket_id");
    const from = await User.findById(data.from).select("socket_id");
    // create frien request
    await FriendRequest.create({
      sender: data.from,
      recipient: data.to,
    });
    io.to(to_user.socket_id).emit(" new_friend_request", {
      message: "new friend  reverse ",
    });
    io.to(from.socket_id).emit(" new_friend_request", {
      message: "request send successfully",
    });
  });
  socket.on("accept_request", async (data) => {
    console.log(data);
    const request_doc = await FriendRequest.findById(data.request_id);
    console.log("request", request_doc);
    const sender = await User.findById(request_doc.sender);
    const receiver = await User.findById(request_doc.recipient);
    sender.friends.push(request_doc.recipient);
    receiver.friends.push(request_doc.sender);
    await receiver.save({ new: true, validateModifiedOnly: true });
    await sender.save({ new: true, validateModifiedOnly: true });
    await FriendRequest.findByIdAndDelete(data.request_id);
    io.to(sender.socket_id).emit("request_accepted", {
      message: "friend request accepted",
    });
    io.to(receiver.socket_id).emit("request_accepted", {
      message: "friend request accepted",
    });
  socket.on("end", () => {
    console.log("closing connection");
    socket.disconnect();
  }
)
  });
});
process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
