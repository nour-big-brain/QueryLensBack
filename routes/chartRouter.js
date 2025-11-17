const express = require("express");
const router = express.Router();
const { getChartData, getRawQueryData, getDatabaseMetadata } = require("../controllers/chartController");
router.get("/metadata/:dataSourceId", getDatabaseMetadata);
// Get chart data in standardized format
// Example: GET /api/charts/68f6ce526798ce412a95fedb?chartType=line

router.get("/:queryId", getChartData);

// Get raw query results without transformation
// Example: GET /api/charts/68f6ce526798ce412a95fedb/raw
router.get("/:queryId/raw", getRawQueryData);

module.exports = router;