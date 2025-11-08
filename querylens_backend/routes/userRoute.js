const express = require("express");
const { addUser } = require("../controllers/userController");

const router = express.Router();

router.post("/users", addUser);

module.exports = router;
