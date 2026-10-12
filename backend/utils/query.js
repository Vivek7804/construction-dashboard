const mongoose = require("mongoose");
const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const pagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(query.limit, 10) || 10, 1),
    100,
  );
  return { page, limit, skip: (page - 1) * limit };
};
const response = (
  res,
  {
    data,
    message = "Request completed successfully",
    status = 200,
    pagination: meta,
  },
) =>
  res
    .status(status)
    .json({ success: true, message, data, ...(meta && { pagination: meta }) });
module.exports = { isObjectId, pagination, response };
