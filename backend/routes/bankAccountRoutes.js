const router = require("express").Router();
const controller = require("../controllers/bankAccountController");

router.route("/").get(controller.list).post(controller.create);
router.patch("/:id/status", controller.updateStatus);
router.patch("/:id", controller.update);

module.exports = router;
