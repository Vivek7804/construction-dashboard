
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const connectDatabase = require("./config/db");

const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const Supplier = require("./models/Supplier");
const Material = require("./models/Material");
const Labour = require("./models/Labour");
const ClientPayment = require("./models/ClientPayment");

const { createResource } = require("./controllers/resourceController");

const app = express();

app.disable("x-powered-by");

// Validate required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is required. Add it to backend/.env.");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required. Add it to backend/.env.");
}

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

// Parse JSON request bodies
app.use(express.json({ limit: "100kb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Construction Dashboard API is healthy",
    data: {
      database:
        mongoose.connection.readyState === 1
          ? "connected"
          : "disconnected",
    },
  });
});

// Public authentication routes
app.use("/api/auth", require("./routes/authRoutes"));

// Protect subsequent API routes
app.use(require("./middleware/auth"));

// Site routes
app.use("/api/sites", require("./routes/siteRoutes"));

// Expense routes
app.use("/api/expenses", require("./routes/expenseRoutes"));

// Bank account balances are available only to authenticated administrators.
app.use("/api/bank-accounts", require("./routes/bankAccountRoutes"));

// Dashboard routes
app.use("/api/dashboard", require("./routes/dashboardRoutes"));

// Supplier routes
app.use(
  "/api/suppliers",
  require("./routes/resourceRoutes")(
    createResource(Supplier, "Supplier")
  )
);

// Material routes
app.use(
  "/api/materials",
  require("./routes/resourceRoutes")(
    createResource(Material, "Material", "site supplier")
  )
);

// Labour routes
app.use(
  "/api/labour",
  require("./routes/resourceRoutes")(
    createResource(Labour, "Labour", "site")
  )
);

// Client payment routes
app.use(
  "/api/payments",
  require("./routes/resourceRoutes")(
    createResource(ClientPayment, "Payment", "site")
  )
);

// Handle unknown endpoints
app.use(notFound);

// Centralized error handling
app.use(errorHandler);

// Start the server only after MongoDB connects
const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
      console.log("MongoDB Atlas connected successfully");
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
