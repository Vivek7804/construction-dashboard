const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.0001 },
    unit: { type: String, required: true },
    rate: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);
schema.virtual("totalCost").get(function total() {
  return this.quantity * this.rate;
});
schema.set("toJSON", { virtuals: true });
module.exports = mongoose.model("Material", schema);
