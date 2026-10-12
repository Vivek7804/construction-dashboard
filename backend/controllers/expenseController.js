const Expense = require("../models/Expense");
const Site = require("../models/Site");
const Supplier = require("../models/Supplier");
const BankAccount = require("../models/BankAccount");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const { isObjectId, pagination, response } = require("../utils/query");
const categories = [
  "Materials",
  "Labour",
  "Equipment",
  "Equipment & Machinery",
  "Transportation",
  "Electricity & Utilities",
  "Other",
];
const paymentMethods = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card"];
const requireReference = async (Model, id, name) => {
  if (!id || !isObjectId(id) || !(await Model.exists({ _id: id }))) {
    const e = new Error(`${name} not found`);
    e.statusCode = 400;
    throw e;
  }
};
// const prepare = async (body) => {
//   await requireReference(Site, body.site, "Site");
//   if (body.supplier)
//     await requireReference(Supplier, body.supplier, "Supplier");
//   return body;
// };


const prepare = async (body) => {
  if (!body.site || !isObjectId(body.site)) {
    const error = new Error("Please select a valid construction site");
    error.statusCode = 400;
    throw error;
  }

  await requireReference(Site, body.site, "Site");

  if (body.supplier) {
    await requireReference(Supplier, body.supplier, "Supplier");
  }

  if (!categories.includes(body.category)) {
    const error = new Error("Please select a valid expense category");
    error.statusCode = 400;
    throw error;
  }

  const quantity = Number(body.quantity);
  const ratePerUnit = Number(body.ratePerUnit);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    const error = new Error("Quantity must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(ratePerUnit) || ratePerUnit < 0) {
    const error = new Error("Rate per unit must be zero or greater");
    error.statusCode = 400;
    throw error;
  }

  const date = new Date(body.date);
  if (!body.date || Number.isNaN(date.getTime())) {
    const error = new Error("Please provide a valid expense date");
    error.statusCode = 400;
    throw error;
  }

  const paymentStatus = body.paymentStatus || "Pending";
  if (!["Paid", "Pending", "Failed"].includes(paymentStatus)) {
    const error = new Error("Payment status must be Paid, Pending, or Failed");
    error.statusCode = 400;
    throw error;
  }

  const paymentMethod = body.paymentMethod || "Bank Transfer";
  if (!paymentMethods.includes(paymentMethod)) {
    const error = new Error("Please select a valid payment method");
    error.statusCode = 400;
    throw error;
  }
  const bankPayment = paymentMethod !== "Cash";
  const requiresBankDeduction = paymentStatus === "Paid" && bankPayment;
  const bankAccount = paymentMethod === "Cash" ? null : body.bankAccount;
  const totalAmount = Number((quantity * ratePerUnit).toFixed(2));

  if (totalAmount <= 0) {
    const error = new Error("Expense amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  if (bankAccount && !isObjectId(bankAccount)) {
    const error = new Error("Please select a valid bank account");
    error.statusCode = 400;
    throw error;
  }
  if (requiresBankDeduction && !bankAccount) {
    const error = new Error("A bank account is required for a paid non-cash expense");
    error.statusCode = 400;
    throw error;
  }
  if (requiresBankDeduction && !body.deductionReference?.trim()) {
    const error = new Error("A payment reference is required to prevent duplicate deductions");
    error.statusCode = 400;
    throw error;
  }

  if (bankAccount) {
    const bank = await BankAccount.exists({ _id: bankAccount, isActive: true });
    if (!bank) {
      const error = new Error("Selected bank account was not found or is inactive");
      error.statusCode = 400;
      throw error;
    }
  }

  return {
    ...body,
    site: body.site,
    quantity,
    ratePerUnit,
    totalAmount,
    date,
    paymentStatus,
    paymentMethod,
    bankAccount: bankAccount || null,
    deductionReference: body.deductionReference?.trim() || undefined,
  };
};

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};
  ["site", "supplier", "category"].forEach((key) => {
    if (req.query[key]) filter[key] = req.query[key];
  });
  if (req.query.from || req.query.to)
    filter.date = {
      ...(req.query.from && { $gte: new Date(req.query.from) }),
      ...(req.query.to && { $lte: new Date(req.query.to) }),
    };
  const [data, total] = await Promise.all([
    Expense.find(filter)
      .populate("site", "name location")
      .populate("supplier", "name")
      .sort(req.query.sort || "-date")
      .skip(skip)
      .limit(limit),
    Expense.countDocuments(filter),
  ]);
  response(res, {
    data,
    message: "Expenses retrieved successfully",
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
exports.get = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid expense ID" });
  const data = await Expense.findById(req.params.id)
    .populate("site", "name")
    .populate("supplier", "name");
  if (!data)
    return res
      .status(404)
      .json({ success: false, message: "Expense not found" });
  response(res, { data });
});
exports.create = asyncHandler(async (req, res) => {
  const values = await prepare(req.body);
  const requiresBankDeduction =
    values.paymentStatus === "Paid" && values.paymentMethod !== "Cash";

  if (!requiresBankDeduction) {
    const data = await Expense.create(values);
    return response(res, {
      data,
      message: "Expense created successfully",
      status: 201,
    });
  }

  const session = await mongoose.startSession();
  let data;
  try {
    await session.withTransaction(async () => {
      const bank = await BankAccount.findOneAndUpdate(
        {
          _id: values.bankAccount,
          isActive: true,
          balance: { $gte: values.totalAmount },
        },
        { $inc: { balance: -values.totalAmount } },
        { new: true, session },
      );

      if (!bank) {
        const error = new Error(
          "The selected bank account is inactive or has insufficient available balance",
        );
        error.statusCode = 409;
        throw error;
      }

      [data] = await Expense.create([values], { session });
    });
  } catch (error) {
    const transactionUnavailable =
      error.code === 20 ||
      /Transaction numbers are only allowed|replica set|transactions are not supported/i.test(
        error.message,
      );
    if (transactionUnavailable) {
      const configurationError = new Error(
        "Paid bank expenses require MongoDB transactions. Configure this database as an Atlas replica set before recording bank payments.",
      );
      configurationError.statusCode = 503;
      throw configurationError;
    }
    throw error;
  } finally {
    await session.endSession();
  }

  response(res, { data, message: "Expense created successfully", status: 201 });
});
exports.update = asyncHandler(async (req, res) => {
  const current = await Expense.findById(req.params.id);
  if (!current)
    return res
      .status(404)
      .json({ success: false, message: "Expense not found" });
  const values = { ...current.toObject(), ...req.body };
  await prepare(values);
  Object.assign(current, req.body);
  await current.save();
  response(res, { data: current, message: "Expense updated successfully" });
});
exports.remove = asyncHandler(async (req, res) => {
  const data = await Expense.findByIdAndDelete(req.params.id);
  if (!data)
    return res
      .status(404)
      .json({ success: false, message: "Expense not found" });
  response(res, { data: null, message: "Expense deleted successfully" });
});
