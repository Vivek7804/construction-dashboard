const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
    worker: { type: String, required: true, trim: true },
    workDescription: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.0001 },
    rate: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "days" },
  },
  { timestamps: true },
);
schema.virtual("totalCost").get(function total() {
  return this.quantity * this.rate;
});
schema.set("toJSON", { virtuals: true });
module.exports = mongoose.model("Labour", schema);
