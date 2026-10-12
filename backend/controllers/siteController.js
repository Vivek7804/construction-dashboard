const Site = require("../models/Site");
const Expense = require("../models/Expense");
const Material = require("../models/Material");
const Labour = require("../models/Labour");
const ClientPayment = require("../models/ClientPayment");
const Supplier = require("../models/Supplier");
const asyncHandler = require("../utils/asyncHandler");
const { isObjectId, pagination, response } = require("../utils/query");
const findSite = async (id) => {
  if (!isObjectId(id)) {
    const e = new Error("Invalid site ID");
    e.statusCode = 400;
    throw e;
  }
  const site = await Site.findById(id);
  if (!site) {
    const e = new Error("Site not found");
    e.statusCode = 404;
    throw e;
  }
  return site;
};
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search)
    filter.$or = ["name", "owner", "location"].map((field) => ({
      [field]: { $regex: req.query.search, $options: "i" },
    }));
  const sortFields = {
    newest: "-createdAt",
    oldest: "createdAt",
    name: "name",
    budget: "-budget",
  };
  const [records, total] = await Promise.all([
    Site.find(filter)
      .sort(sortFields[req.query.sort] || "-createdAt")
      .skip(skip)
      .limit(limit)
      .lean(),
    Site.countDocuments(filter),
  ]);
  const totals = await Expense.aggregate([
    { $match: { site: { $in: records.map((site) => site._id) } } },
    { $group: { _id: "$site", spent: { $sum: "$totalAmount" } } },
  ]);
  const spentBySite = new Map(
    totals.map((item) => [String(item._id), item.spent]),
  );
  const data = records.map((site) => ({
    ...site,
    spent: spentBySite.get(String(site._id)) || 0,
  }));
  response(res, {
    data,
    message: "Sites retrieved successfully",
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
exports.get = asyncHandler(async (req, res) =>
  response(res, {
    data: await findSite(req.params.id),
    message: "Site retrieved successfully",
  }),
);
exports.create = asyncHandler(async (req, res) => {
  const site = await Site.create(req.body);
  response(res, {
    data: site,
    message: "Site created successfully",
    status: 201,
  });
});
exports.update = asyncHandler(async (req, res) => {
  await findSite(req.params.id);
  const site = await Site.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  response(res, { data: site, message: "Site updated successfully" });
});
exports.remove = asyncHandler(async (req, res) => {
  await findSite(req.params.id);
  const count = await Expense.countDocuments({ site: req.params.id });
  if (count)
    return res
      .status(409)
      .json({
        success: false,
        message:
          "Cannot delete a site with expense records. Remove its linked records first.",
      });
  await Promise.all([
    Material.deleteMany({ site: req.params.id }),
    Labour.deleteMany({ site: req.params.id }),
    ClientPayment.deleteMany({ site: req.params.id }),
    Site.findByIdAndDelete(req.params.id),
  ]);
  response(res, { data: null, message: "Site deleted successfully" });
});
exports.summary = asyncHandler(async (req, res) => {
  const site = await findSite(req.params.id);
  const [expenseTotals, payments, materials, labour, recent] =
    await Promise.all([
      Expense.aggregate([
        { $match: { site: site._id } },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
            material: {
              $sum: {
                $cond: [{ $eq: ["$category", "Materials"] }, "$totalAmount", 0],
              },
            },
            labour: {
              $sum: {
                $cond: [{ $eq: ["$category", "Labour"] }, "$totalAmount", 0],
              },
            },
          },
        },
      ]),
      ClientPayment.aggregate([
        { $match: { site: site._id } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Material.find({ site: site._id }).populate("supplier", "name"),
      Labour.find({ site: site._id }),
      Expense.find({ site: site._id })
        .sort("-date")
        .limit(5)
        .populate("supplier", "name"),
    ]);
  const totals = expenseTotals[0] || { total: 0, material: 0, labour: 0 };
  const received = payments[0]?.total || 0;
  response(res, {
    data: {
      site,
      projectBudget: site.budget,
      totalExpenses: totals.total,
      remainingBudget: site.budget - totals.total,
      materialExpenses: totals.material,
      labourExpenses: totals.labour,
      clientPaymentsReceived: received,
      balanceReceivable: Math.max(0, site.budget - received),
      materials,
      labour,
      recentTransactions: recent,
    },
  });
});
exports.related = (Model, populate = "") =>
  asyncHandler(async (req, res) => {
    await findSite(req.params.id);
    const data = await Model.find({ site: req.params.id })
      .sort("-date -createdAt")
      .populate(populate);
    response(res, { data, message: "Related records retrieved successfully" });
  });
exports.suppliers = asyncHandler(async (req, res) => {
  await findSite(req.params.id);
  const ids = await Expense.distinct("supplier", {
    site: req.params.id,
    supplier: { $ne: null },
  });
  response(res, {
    data: await Supplier.find({ _id: { $in: ids } }),
    message: "Site suppliers retrieved successfully",
  });
});
