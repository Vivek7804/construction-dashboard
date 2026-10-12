const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token =
    req.headers.authorization?.startsWith("Bearer ") &&
    req.headers.authorization.slice(7);
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "Admin authentication is required" });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res
      .status(401)
      .json({
        success: false,
        message: "Your admin session is invalid or expired",
      });
  }
};
