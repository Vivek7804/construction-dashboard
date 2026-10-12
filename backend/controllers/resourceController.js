const asyncHandler = require("../utils/asyncHandler");
const { isObjectId, pagination, response } = require("../utils/query");
exports.createResource = (Model, label, populate = "") => ({
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const filter = req.query.site ? { site: req.query.site } : {};
    const [data, total] = await Promise.all([
      Model.find(filter)
        .populate(populate)
        .sort("-createdAt")
        .skip(skip)
        .limit(limit),
      Model.countDocuments(filter),
    ]);
    response(res, {
      data,
      message: `${label} retrieved successfully`,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
  get: asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id))
      return res
        .status(400)
        .json({ success: false, message: `Invalid ${label} ID` });
    const data = await Model.findById(req.params.id).populate(populate);
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: `${label} not found` });
    response(res, { data });
  }),
  create: asyncHandler(async (req, res) =>
    response(res, {
      data: await Model.create(req.body),
      message: `${label} created successfully`,
      status: 201,
    }),
  ),
  update: asyncHandler(async (req, res) => {
    const data = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: `${label} not found` });
    response(res, { data, message: `${label} updated successfully` });
  }),
  remove: asyncHandler(async (req, res) => {
    const data = await Model.findByIdAndDelete(req.params.id);
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: `${label} not found` });
    response(res, { data: null, message: `${label} deleted successfully` });
  }),
});
