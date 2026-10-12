const Site = require("../models/Site");
const Expense = require("../models/Expense");
const BankAccount = require("../models/BankAccount");
const asyncHandler = require("../utils/asyncHandler");
const { response } = require("../utils/query");
exports.summary = asyncHandler(async (req, res) => {
  const [statusCounts, financial, recent] = await Promise.all([
    Site.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          budget: { $sum: "$budget" },
        },
      },
    ]),
    Expense.aggregate([
      { $group: { _id: null, totalExpenses: { $sum: "$totalAmount" } } },
    ]),
    Expense.find()
      .sort("-date")
      .limit(10)
      .populate("site", "name location")
      .populate("supplier", "name"),
  ]);
  const statuses = Object.fromEntries(
    statusCounts.map((x) => [x._id, x.count]),
  );
  const totalBudget = statusCounts.reduce((sum, x) => sum + x.budget, 0);
  const totalExpenses = financial[0]?.totalExpenses || 0;
  response(res, {
    data: {
      totalSites: statusCounts.reduce((sum, x) => sum + x.count, 0),
      inProgress: statuses["In Progress"] || 0,
      completed: statuses.Completed || 0,
      onHold: statuses["On Hold"] || 0,
      totalProjectBudget: totalBudget,
      totalExpenses,
      remainingBudget: totalBudget - totalExpenses,
      recentExpenses: recent,
    },
  });
});
exports.accounts = asyncHandler(async (req, res) =>
  response(res, {
    data: await BankAccount.find({ isActive: true })
      .select("bankName accountLastFour accountType balance isActive")
      .sort("bankName")
      .lean(),
    message: "Active bank accounts retrieved successfully",
  }),
);
exports.recentExpenses = asyncHandler(async (req, res) =>
  response(res, {
    data: await Expense.find()
      .sort("-date")
      .limit(Math.min(Number(req.query.limit) || 10, 50))
      .populate("site", "name")
      .populate("supplier", "name"),
  }),
);
