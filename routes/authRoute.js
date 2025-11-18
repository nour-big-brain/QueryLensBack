const express = require("express");
const router = express.Router();
const { register, login, refreshToken , getUserByUsername} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.get('/user/:username', getUserByUsername);

module.exports = router;