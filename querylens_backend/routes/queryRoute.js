const express = require("express");
const { buildQuery,assignQueryToDashboard } = require("../controllers/queryController");

const router = express.Router();

router.post("/queries", buildQuery);
router.post("/queries/assign", assignQueryToDashboard);
module.exports = router;
