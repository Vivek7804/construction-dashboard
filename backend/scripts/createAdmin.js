require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDatabase = require("../config/db");
const Admin = require("../models/Admin");

async function createAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD)
    throw new Error(
      "Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in backend/.env before creating an admin",
    );
  await connectDatabase();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await Admin.findOneAndUpdate(
    { email: ADMIN_EMAIL.toLowerCase() },
    { name: ADMIN_NAME, email: ADMIN_EMAIL.toLowerCase(), passwordHash },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log("Admin account created or updated.");
  await mongoose.disconnect();
}
createAdmin().catch(async (error) => {
  console.error(`Admin setup failed: ${error.message}`);
  await mongoose.disconnect();
  process.exit(1);
});
