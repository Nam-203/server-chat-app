const { response } = require("express");
const User = require("../models/UserModel");
const filterObj = require("../utils/filterObj");
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
  const otp_expiry_time = Date.now()+ 10*60*1000;//10 minutes
  await User.findByIdAndUpdate(userId, {
    otp :new_otp,
    otp_expiry_time
  })
  //todo send otp
  return res.status(200).json({
    status : "success",
    message : "OTP sent successfully",
  
  })  
};
exports.verifyOTP = async (req, res) => {
  //verify and up usser 
  const {email,otp} = req.body
  const user = await User.findOne({email , otp_expiry_time :{$gt :Date.now()}})
  if (!user) {
    return res.status(400).json({
      status : "error",
      message : "Email invalid or OTP expired"
    })
  }
  if (!await user.correctOTP(otp, user.otp)) {
      return res.status(400).json({
        status : "error",
        message : "Incorrect OTP"
      })

  }
  user.otp = undefined,
  user.verified = true
  await user.save({new:true,validateModifiedOnly:true})
  const token = signToken(user._id)
  return res.status(200).json({
    status: "success",
    message: "otp verified success!",
    token,
  });
}
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
