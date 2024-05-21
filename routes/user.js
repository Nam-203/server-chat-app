const router = require('express').Router();
const userController = require("../controller/user")
const authController = require("../controller/auth")
router.get('/get-users', authController.protect , userController.getUsers)
router.patch("/update-me",authController.protect,userController.updateMe)
router.get("/get-friends",authController.protect,userController.getFriends)
router.get("/get-friend-request",authController.protect,userController.getRequests)
router.get("/get-me", authController.protect, userController.getMe);
// router.post(
//     "/generate-zego-token",
//     authController.protect,
//     userController.generateZegoToken
// //   );
// router.post("/start-audio-call", authController.protect, userController.startAudioCall);
// router.post("/start-video-call", authController.protect, userController.startVideoCall);
module.exports = router;
