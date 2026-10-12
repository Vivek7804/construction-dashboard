const router = require("express").Router();
const c = require("../controllers/expenseController");
router.route("/").get(c.list).post(c.create);
router.route("/:id").get(c.get).patch(c.update).delete(c.remove);
module.exports = router;
