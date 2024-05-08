const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
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
    verified: { type: Boolean, default: false },
    otp: { type: Number },
    otp_expiry_time: { type: Date },
  },
  {
    timestamps: true,
  }
);
userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("otp") || !this.otp) return next();

  // Hash the otp with cost of 12
  this.otp = await bcrypt.hash(this.otp.toString(), 12);

  console.log(this.otp.toString(), "FROM PRE SAVE HOOK");

  next();
});
userSchema.methods.correctOTP = async function (candidateOTP, userOTP) {
  return await bcrypt.compare(candidateOTP, userOTP);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
