const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  recipient: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },

},{
    timestamps: true,
  
}
);

const FriendRequest = mongoose.model("FriendRequest", requestSchema);
module.exports = FriendRequest;