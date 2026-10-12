const mongoose = require("mongoose");

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required. Add it to backend/.env.");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected (${mongoose.connection.host})`);
}

module.exports = connectDatabase;
