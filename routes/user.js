const router = require('express').Router();
const userController = require("../controller/user")
const authController = require("../controller/auth")

router.post("/update-me",authController.protect,userController.updateMe)
module.exports = router;
