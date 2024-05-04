const express = require("express");
const morgan = require("morgan");
//morgan: Middleware ghi nhật ký yêu cầu HTTP để ghi lại các yêu cầu đến máy chủ.
const app = express();
const rateLitmit = require("express-rate-limit");
const helmet = require("helmet");
const cors= require('cors')
//helmet: Middleware để bảo mật ứng dụng Express bằng cách thiết lập các tiêu đề HTTP khác nhau.
const mongosanitize = require("express-mongo-sanitize");
//express-mongo-sanitize: Middleware để làm sạch đầu vào người dùng để ngăn chặn các cuộc tấn công nhúng MongoDB.
const bodyParser = require("body-parser");
const xss = require("xss-clean");
app.use(express.json({ limit: "50mb" }));
//express.json(): Phân tích các yêu cầu đến với dữ liệu JSON. và dung lương cho phép
app.use(express.urlencoded({ limit: "50mb", extended: true }));
//express.urlencoded(): Phân tích các yêu cầu đến với dữ liệu được mã hóa URL.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors({
    origin:'*', // allow to pass data through domains
    methods:["GET","POST","PATCH","DELETE","PUT"],
    credentials:true

}))
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
const limiter = rateLitmit({
  max: 3000,
  // giới hạn tần xuất gọi yêu cầu có thẻ nhận đc ngăn chặn tấn cồng botnet
  windowMs: 60 * 60 * 1000,
  message: "too many requests from IP , please try again in a hour",
});
app.use("/tawk", limiter);
app.use(mongosanitize());
app.use(xss());

module.exports = app;
