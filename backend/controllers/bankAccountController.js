const BankAccount = require("../models/BankAccount");
const asyncHandler = require("../utils/asyncHandler");
const { isObjectId, response } = require("../utils/query");

const accountFields = "bankName accountLastFour accountType balance isActive";

const invalid = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const prepareAccount = (body, { includeBalance = false } = {}) => {
  const values = {
    bankName: body.bankName?.trim(),
    accountLastFour: body.accountLastFour?.trim(),
    accountType: body.accountType?.trim(),
  };
  if (!values.bankName) throw invalid("Bank name is required");
  if (!/^\d{4}$/.test(values.accountLastFour || ""))
    throw invalid("Account identifier must contain exactly four digits");
  if (!values.accountType) throw invalid("Account type is required");

  if (includeBalance) {
    const balance = Number(body.balance);
    if (!Number.isFinite(balance) || balance < 0)
      throw invalid("Opening balance must be a non-negative number");
    values.balance = balance;
  }
  return values;
};

exports.list = asyncHandler(async (req, res) => {
  const filter = req.query.active === "true" ? { isActive: true } : {};
  const data = await BankAccount.find(filter)
    .select(accountFields)
    .sort("bankName")
    .lean();

  response(res, { data, message: "Bank accounts retrieved successfully" });
});

exports.create = asyncHandler(async (req, res) => {
  const values = prepareAccount(req.body, { includeBalance: true });
  if (req.body.isActive !== undefined && typeof req.body.isActive !== "boolean")
    throw invalid("Account status must be true or false");
  const data = await BankAccount.create({
    ...values,
    isActive: req.body.isActive === undefined ? true : req.body.isActive,
  });
  response(res, { data, message: "Bank account created successfully", status: 201 });
});

exports.update = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) throw invalid("Invalid bank account ID");
  const data = await BankAccount.findByIdAndUpdate(
    req.params.id,
    prepareAccount(req.body),
    { new: true, runValidators: true },
  ).select(accountFields);
  if (!data) {
    const error = new Error("Bank account not found");
    error.statusCode = 404;
    throw error;
  }
  response(res, { data, message: "Bank account updated successfully" });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) throw invalid("Invalid bank account ID");
  if (typeof req.body.isActive !== "boolean")
    throw invalid("Account status must be true or false");
  const data = await BankAccount.findByIdAndUpdate(
    req.params.id,
    { isActive: req.body.isActive },
    { new: true, runValidators: true },
  ).select(accountFields);
  if (!data) {
    const error = new Error("Bank account not found");
    error.statusCode = 404;
    throw error;
  }
  response(res, {
    data,
    message: `Bank account ${data.isActive ? "activated" : "deactivated"} successfully`,
  });
});
