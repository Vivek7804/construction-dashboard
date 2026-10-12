const mongoose = require("mongoose");
module.exports = mongoose.model(
  "ClientPayment",
  new mongoose.Schema(
    {
      site: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Site",
        required: true,
      },
      date: { type: Date, required: true },
      amount: { type: Number, required: true, min: 0.01 },
      paymentMethod: {
        type: String,
        enum: ["Cash", "UPI", "Bank Transfer", "Cheque", "Card"],
        default: "Bank Transfer",
      },
      remark: { type: String, trim: true, maxlength: 500 },
    },
    { timestamps: true },
  ),
);
