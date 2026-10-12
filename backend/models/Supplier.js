const mongoose = require("mongoose");
module.exports = mongoose.model(
  "Supplier",
  new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true, unique: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      address: { type: String, trim: true },
    },
    { timestamps: true },
  ),
);
