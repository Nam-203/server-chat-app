const router = require('express').Router();
const userController = require("../controller/user")
const authController = require("../controller/auth")
router.get('/get-users', authController.protect , userController.getUSer)
router.patch("/update-me",authController.protect,userController.updateMe)
router.get("/get-friends",authController.protect,userController.getFriends)
router.get("/get-friend-request",authController.protect,userController.getRequests)

module.exports = router;
