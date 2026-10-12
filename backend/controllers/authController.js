const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const asyncHandler = require("../utils/asyncHandler");

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required" });
  const admin = await Admin.findOne({
    email: email.toLowerCase().trim(),
  }).select("+passwordHash");
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash)))
    return res
      .status(401)
      .json({ success: false, message: "Invalid admin email or password" });
  const token = jwt.sign(
    { sub: admin._id, role: "admin", name: admin.name },
    process.env.JWT_SECRET,
    { expiresIn: "8h" },
  );
  return res.json({
    success: true,
    message: "Admin login successful",
    data: {
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    },
  });
});

exports.me = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin.sub).select("name email");
  if (!admin)
    return res
      .status(401)
      .json({ success: false, message: "Admin account no longer exists" });
  return res.json({ success: true, data: admin });
});
