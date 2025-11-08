const express = require("express");
const { buildQuery } = require("../controllers/queryController");

const router = express.Router();

router.post("/queries", buildQuery);

module.exports = router;
