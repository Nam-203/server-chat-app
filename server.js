const app = require("./app");
const http = require("http");
const server = http.createServer(app);
const dotenv = require("dotenv");
const { default: mongoose } = require("mongoose");

dotenv.config();
process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
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
process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
