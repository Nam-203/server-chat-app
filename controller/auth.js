const { promisify } = require("util");
const User = require("../models/UserModel");
const filterObj = require("../utils/filterObj");
const crypto = require("crypto");
const otpGenerator = require("otp-generator");
const catchAsync = require("../utils/catchAsync");
const mailService = require("../services/mailer");
const emailService = require("../services/sendResetPass");
const jwt = require("jsonwebtoken");
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
      await User.findOneAndUpdate({ email: email }, filteredBody, {
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
  const user = await User.findByIdAndUpdate(userId, {
    otp_expiry_time,
  });
  user.otp = new_otp.toString();
  await user.save({ new: true, validateModifiedOnly: true });
  //todo send otp mail
  const email = req.body.email;
  await mailService.sendEmail(email, new_otp);
  return res.status(200).json({
    status: "success",
    message: "OTP sent successfully",
  });
};
exports.verifyOTP = catchAsync(async (req, res, next) => {
  // verify otp and update user accordingly
  const { email, otp } = req.body;
  console.log(req.body);
  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Email is invalid or OTP expired",
    });
  }

  if (user.verified) {
    return res.status(400).json({
      status: "error",
      message: "Email is already verified",
    });
  }

  if (!(await user.correctOTP(otp, user.otp))) {
    res.status(400).json({
      status: "error",
      message: "OTP is incorrect",
    });

    return;
  }

  // OTP is correct

  user.verified = true;
  user.otp = undefined;
  await user.save({ new: true, validateModifiedOnly: true });

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "OTP verified Successfully!",
    token,
    user_id: user._id,
  });
});

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
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "There is no user with email address.",
    });
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken() ;
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `http://localhost:3001/auth/new-password?token=${resetToken}`;
    // TODO => Send Email with this Reset URL to user's email address

    console.log(resetURL);
const email = user.email
    await emailService.sendEmailLink(email, resetURL);
    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      message: "There was an error sending the email. Try again later!",
    });
  }
});
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
