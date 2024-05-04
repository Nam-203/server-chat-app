const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  fistName: { type: string, require: true },
  lastName: { type: string, require: true },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (email) {
        return String(email)
          .toLowerCase()
          .match(
            ` /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/`
          );
      },
    },
  },
  password: { type: String, required: true },
  passwordChangeAt: { type: Date },
  passwordResetToken: { type: String },
  passwordExpireIn: { type: Date },

  avatar: { type: String },
},
{
    timestamps: true
});
const User = mongoose.model("User", userSchema);
module.exports = User;

