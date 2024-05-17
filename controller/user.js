const FriendRequest = require("../models/friendRequest");
const User = require("../models/UserModel");
const catchAsync = require("../utils/catchAsync");
const filterObj = require("../utils/filterObj");
exports.updateMe = async (req, res, next) => {
  const { user } = req;
  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "about",
    "avatar"
  );
  const update_user = await User.findByIdAndUpdate(user._id, filteredBody, {
    new: true,
    validateModifiedOnly: true,
  });
  return res.status(200).json({
    status: "success",
    data: update_user,
    message: "profile updated successfully",
  });
};
exports.getUSer = async (req, res, next) => {
  const all_users = await User.find({ verified: true }).select(
    "firstName lastName _id"
  );
  const this_user = req.user;
  const remaining_users = all_users.filter(
    (user) =>
      !this_user.friend.includes(user._id) &&
      user._id.toString() !== req.user._id.toString()
  );
  return res.status(200).json({
    status: "success",
    data: remaining_users,
    message: "users fetched successfully",
  });
};
exports.getRequests = async (req, res,next) => {
const request = await FriendRequest.find({recipient: req.user._id}).populate("sender","_id fisrtName lastName")
return res.status(200).json({
  status: "success",
  data: request,
  message: "requests fetched successfully",
})
};
exports.getFriends = catchAsync(async (req, res, next) => {
  const this_user = await User.findById(req.user._id).populate(
    "friends",
    "_id firstName lastName"
  );
  res.status(200).json({
    status: "success",
    data: this_user.friends,
    message: "Friends found successfully!",
  });
});
