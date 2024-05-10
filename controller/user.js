const User = require("../models/UserModel");
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
