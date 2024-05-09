const { promisify } = require("util");
const User = require("../models/UserModel");
const filterObj = require("../utils/filterObj");
const crypto = require("crypto");
const otpGenerator = require("otp-generator");
const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);
exports.register = async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;
  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "password",
    "email"
  );
  try {
    //check if the veryfied user with given mail exit
    const existing_user = await User.findOne({ email: email });
    if (existing_user && !existing_user.verified) {
      return res.status(400).json({
        status: "error",
        message: "email already in use, please login again",
      });
    } else if (existing_user) {
      await User.findByIdAndUpdate({ email: email }, filterObj, {
        new: true,
        validateModifiedOnly: true,
      });
      //send otp mail to usser
      req.userId = existing_user._id;
      next();
    } else {
      //iff usser record iss not valiable here
      const new_user = await User.create(filteredBody);
      req.userId = new_user._id;
      next();
    }
  } catch (error) {
    console.log(error);
  }
};
exports.sendOTP = async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
  const otp_expiry_time = Date.now() + 10 * 60 * 1000; //10 minutes
  await User.findByIdAndUpdate(userId, {
    otp: new_otp,
    otp_expiry_time,
  });
  //todo send otp
  return res.status(200).json({
    status: "success",
    message: "OTP sent successfully",
  });
};
exports.verifyOTP = async (req, res) => {
  //verify and up usser
  const { email, otp } = req.body;
  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Email invalid or OTP expired",
    });
  }
  if (!(await user.correctOTP(otp, user.otp))) {
    return res.status(400).json({
      status: "error",
      message: "Incorrect OTP",
    });
  }
  (user.otp = undefined), (user.verified = true);
  await user.save({ new: true, validateModifiedOnly: true });
  const token = signToken(user._id);
  return res.status(200).json({
    status: "success",
    message: "otp verified success!",
    token,
  });
};
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // console.log(email, password);

  if (!email || !password) {
    res.status(400).json({
      status: "error",
      message: "Both email and password are required",
    });
    return;
  }

  const user = await User.findOne({ email: email }).select("+password");

  if (!user || !user.password) {
    res.status(400).json({
      status: "error",
      message: "Incorrect password",
    });

    return;
  }

  if (!user || !(await user.correctPassword(password, user.password))) {
    res.status(400).json({
      status: "error",
      message: "Email or password is incorrect",
    });

    return;
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Logged in successfully!",
    token,
    user_id: user._id,
  });
});
exports.forgotPassword = async (req, res, next) => {
  //1 get email from usserver
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "there are no users with that email address",
    });
  }
  //generate the readom reset token
  const resetToken = user.createPasswodResetToken();
  await user.save({ validateModifiedOnly: false });
  try {
    // todo =>send mail to reset
    const resetURL = `https://tawk.com/auth/reset-password/?code=${resetToken}`;
    return res.status(200).json({
      status: "ok",
      message: "Reset password link sent to your email",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    return res.status(500).json({
      status: "error",
      message: "there was an error sending the email, please try again",
    });
  }
};
exports.resetPassword = async (req, res, next) => {
  // get uuser based token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // if toke has expired or user is out time window
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Token is invalid or has expired",
    });
  }
  // update user password anf set refresh token & expiry to undefined
  user.password = req.body.password;
  user.passwordComfirm = req.body.passwordComfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save({ validateModifiedOnly: false });
  //4 log in the user and send new token
  const token = signToken(user._id);
  return res.status(200).json({
    status: "success",
    message: "Password reset successfully",
    token,
  });
};
exports.protect = async (req, res, next) => {
  // ge token and check if there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else {
    return res.status(401).json({
      status: "error",
      message: "You are not logged in! Please log in to get access",
    });
  }
  // verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //check if user still exits
  const this_user = await User.findById(decoded.userId);
  if (!this_user) {
    return res.status(401).json({
      status: "error",
      message: "The user belonging to this token does no longer exist",
    });
  }
  //check if user changed password after the token was issued
  if (this_user.changedPasswordAfter(decoded.iat)) {
    return res.status(401).json({
      status: "error",
      message: "User recently changed password! Please log in again",
    });
  }
  req.user = this_user;
  next();
};
// types of eouter => protected Only logger in users can access thss
