
const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: [true, "Construction site is required"],
      index: true,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    date: {
      type: Date,
      required: [true, "Expense date is required"],
      default: Date.now,
    },

    description: {
      type: String,
      required: [true, "Expense description is required"],
      trim: true,
      maxlength: 250,
    },

    category: {
      type: String,
      enum: [
        "Materials",
        "Labour",
        "Equipment",
        "Equipment & Machinery",
        "Transportation",
        "Electricity & Utilities",
        "Other",
      ],
      default: "Materials",
      required: true,
    },

    material: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.0001, "Quantity must be greater than zero"],
    },

    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
      maxlength: 30,
    },

    ratePerUnit: {
      type: Number,
      required: [true, "Rate per unit is required"],
      min: [0, "Rate cannot be negative"],
    },

    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: [0, "Paid amount cannot be negative"],
    },

    paymentMethod: {
      type: String,
      enum: [
        "Cash",
        "UPI",
        "Bank Transfer",
        "Cheque",
        "Card",
      ],
      default: "Bank Transfer",
    },

    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Failed"],
      default: "Pending",
      index: true,
    },

    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      default: null,
      index: true,
    },

    receiptNumber: { type: String, trim: true, maxlength: 120, default: "" },

    deductionReference: {
      type: String,
      trim: true,
      maxlength: 120,
      unique: true,
      sparse: true,
    },

    remark: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Calculate the amount and validate the payment.
expenseSchema.pre("validate", function () {
  if (
    Number.isFinite(this.quantity) &&
    Number.isFinite(this.ratePerUnit) &&
    this.quantity >= 0 &&
    this.ratePerUnit >= 0
  ) {
    this.totalAmount = Number(
      (this.quantity * this.ratePerUnit).toFixed(2)
    );
  }

  if (
    Number.isFinite(this.paidAmount) &&
    Number.isFinite(this.totalAmount) &&
    this.paidAmount > this.totalAmount
  ) {
    this.invalidate(
      "paidAmount",
      "Paid amount cannot exceed the total amount"
    );
  }
});

// Calculate outstanding amount without storing duplicate data.
expenseSchema.virtual("pendingAmount").get(function () {
  return Math.max(0, this.totalAmount - this.paidAmount);
});

// Populate the virtual when documents are converted to JSON.
expenseSchema.set("toJSON", {
  virtuals: true,
});

expenseSchema.index({ site: 1, date: -1 });
expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ supplier: 1 });

module.exports = mongoose.model("Expense", expenseSchema);
