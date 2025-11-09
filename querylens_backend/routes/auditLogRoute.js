const express = require("express");
const router = express.Router();
const {
  getAllAuditLogs,
  getAuditLogById,
  getAuditLogsByUser,
  getAuditLogsByAction,
  getAuditLogsByAdmin
} = require("../controllers/auditLogController");
const { authenticateToken, isAdmin } = require("../middlewares/auth");

router.get("/", authenticateToken, isAdmin, getAllAuditLogs);
router.get("/:id", authenticateToken, isAdmin, getAuditLogById);
router.get("/user/:userId", authenticateToken, isAdmin, getAuditLogsByUser);
router.get("/action/:action", authenticateToken, isAdmin, getAuditLogsByAction);
router.get("/admin/:adminId", authenticateToken, isAdmin, getAuditLogsByAdmin);

module.exports = router;