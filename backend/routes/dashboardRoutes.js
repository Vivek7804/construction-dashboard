const router = require("express").Router();
const c = require("../controllers/dashboardController");
router.get("/summary", c.summary);
router.get("/bank-accounts", c.accounts);
router.get("/recent-expenses", c.recentExpenses);
module.exports = router;
