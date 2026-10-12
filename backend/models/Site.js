const mongoose = require("mongoose");
module.exports = mongoose.model(
  "Site",
  new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true, maxlength: 120 },
      location: { type: String, required: true, trim: true, maxlength: 160 },
      owner: { type: String, required: true, trim: true, maxlength: 120 },
      startDate: { type: Date, required: true },
      expectedCompletionDate: Date,
      budget: { type: Number, required: true, min: 0 },
      status: {
        type: String,
        enum: ["In Progress", "Completed", "On Hold"],
        default: "In Progress",
      },
    },
    { timestamps: true },
  ),
);
