const express = require("express");
const { 
  buildQuery, 
  assignQueryToDashboard,
  getQueriesByDashboardId ,
  retryMetabaseSync  // ← ADD THIS
} = require("../controllers/queryController");

const router = express.Router();

router.post("/queries", buildQuery);
router.post("/queries/assign", assignQueryToDashboard);
router.post("/queries/retry-sync/:queryId", retryMetabaseSync);

// ADD THIS NEW ROUTE
router.get("/queries/by-dashboard/:dashboardId", getQueriesByDashboardId);

module.exports = router;