const mongoose = require("mongoose");

const bankAccountSchema = new mongoose.Schema(
  {
    bankName: {
      type: String,
      required: [true, "Bank name is required"],
      trim: true,
      maxlength: 120,
    },
    accountLastFour: {
      type: String,
      trim: true,
      match: [/^\d{4}$/, "Account identifier must contain exactly four digits"],
      default: "",
    },
    accountType: {
      type: String,
      required: [true, "Account type is required"],
      trim: true,
      maxlength: 80,
    },
    balance: {
      type: Number,
      required: [true, "Account balance is required"],
      min: [0, "Account balance cannot be negative"],
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

bankAccountSchema.index({ bankName: 1, accountLastFour: 1 }, { unique: true });

module.exports = mongoose.model("BankAccount", bankAccountSchema);
