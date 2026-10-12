require("dotenv").config();
const mongoose = require("mongoose");
const connectDatabase = require("../config/db");
const Site = require("../models/Site");
const Supplier = require("../models/Supplier");
const Expense = require("../models/Expense");
const Material = require("../models/Material");
const Labour = require("../models/Labour");
const ClientPayment = require("../models/ClientPayment");

const siteData = [
  {
    name: "Skyline Apartments",
    location: "Hinjewadi, Pune",
    owner: "Aarav Mehta",
    startDate: "2024-02-12",
    expectedCompletionDate: "2025-03-31",
    budget: 12500000,
    status: "In Progress",
  },
  {
    name: "Green Valley Villa",
    location: "Baner, Pune",
    owner: "Nisha Kulkarni",
    startDate: "2024-01-28",
    expectedCompletionDate: "2024-12-30",
    budget: 6800000,
    status: "In Progress",
  },
  {
    name: "Orchid Business Park",
    location: "Wakad, Pune",
    owner: "Arjun Shah",
    startDate: "2023-12-08",
    expectedCompletionDate: "2024-09-15",
    budget: 24000000,
    status: "Completed",
  },
  {
    name: "Lakeview Residency",
    location: "Kharadi, Pune",
    owner: "Kavya Rao",
    startDate: "2024-03-19",
    expectedCompletionDate: "2025-06-30",
    budget: 9800000,
    status: "On Hold",
  },
];
async function run() {
  await connectDatabase();
  const sites = {};
  for (const values of siteData)
    sites[values.name] = await Site.findOneAndUpdate(
      { name: values.name },
      values,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  const suppliers = {};
  for (const values of [
    { name: "Prime Steel Traders", phone: "9000000001" },
    { name: "CraftBuild Contractors", phone: "9000000002" },
    { name: "RMC Solutions", phone: "9000000003" },
    { name: "ElectroMart", phone: "9000000004" },
  ])
    suppliers[values.name] = await Supplier.findOneAndUpdate(
      { name: values.name },
      values,
      { upsert: true, new: true },
    );
  const records = [
    {
      site: "Skyline Apartments",
      supplier: "Prime Steel Traders",
      date: "2024-04-18",
      description: "TMT Steel Bars",
      category: "Materials",
      material: "TMT Steel",
      quantity: 2500,
      unit: "kg",
      ratePerUnit: 125,
      paidAmount: 250000,
    },
    {
      site: "Skyline Apartments",
      supplier: "CraftBuild Contractors",
      date: "2024-04-16",
      description: "Masonry labour - Block A",
      category: "Labour",
      material: "Masonry work",
      quantity: 12,
      unit: "days",
      ratePerUnit: 7200,
      paidAmount: 86400,
    },
    {
      site: "Green Valley Villa",
      supplier: "RMC Solutions",
      date: "2024-04-14",
      description: "Ready Mix Concrete",
      category: "Materials",
      material: "Concrete",
      quantity: 18,
      unit: "m³",
      ratePerUnit: 7500,
      paidAmount: 135000,
    },
    {
      site: "Skyline Apartments",
      supplier: "ElectroMart",
      date: "2024-04-12",
      description: "Electrical conduits",
      category: "Materials",
      material: "PVC conduit",
      quantity: 400,
      unit: "m",
      ratePerUnit: 107,
      paidAmount: 0,
    },
  ];
  for (const record of records) {
    const { site, supplier, ...values } = record;
    await Expense.findOneAndUpdate(
      {
        site: sites[site]._id,
        description: values.description,
        date: values.date,
      },
      { ...values, site: sites[site]._id, supplier: suppliers[supplier]._id },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  }
  await Material.findOneAndUpdate(
    { site: sites["Skyline Apartments"]._id, name: "TMT Steel" },
    {
      site: sites["Skyline Apartments"]._id,
      supplier: suppliers["Prime Steel Traders"]._id,
      name: "TMT Steel",
      quantity: 2500,
      unit: "kg",
      rate: 125,
    },
    { upsert: true, new: true },
  );
  await Labour.findOneAndUpdate(
    { site: sites["Skyline Apartments"]._id, worker: "CraftBuild Contractors" },
    {
      site: sites["Skyline Apartments"]._id,
      worker: "CraftBuild Contractors",
      workDescription: "Masonry work - Block A",
      quantity: 12,
      unit: "days",
      rate: 7200,
    },
    { upsert: true, new: true },
  );
  await ClientPayment.findOneAndUpdate(
    {
      site: sites["Skyline Apartments"]._id,
      date: "2024-04-10",
      amount: 3500000,
    },
    {
      site: sites["Skyline Apartments"]._id,
      date: "2024-04-10",
      amount: 3500000,
      paymentMethod: "Bank Transfer",
      remark: "Milestone payment",
    },
    { upsert: true, new: true },
  );
  console.log(
    "Seed completed. Existing records were upserted; unrelated data was not removed.",
  );
  await mongoose.disconnect();
}
run().catch(async (error) => {
  console.error(`Seed failed: ${error.message}`);
  await mongoose.disconnect();
  process.exit(1);
});
