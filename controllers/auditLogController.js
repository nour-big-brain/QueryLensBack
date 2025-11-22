const AuditLog = require("../models/auditLog");
const createAuditLog = async (action, targetUserId, performedBy, details) => {
  try {
    const auditLog = new AuditLog({
      logId: `${action}-${Date.now()}`,
      action,
      targetUserId,
      performedBy,
      details
    });
    await auditLog.save();
    return auditLog;
  } catch (e) {
    console.error('Failed to create audit log:', e.message);
  }
};

// Get all audit logs
const getAllAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate("targetUserId", "username email")
      .populate("performedBy", "username email")
      .sort({ timestamp: -1 });

    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Get single audit log by ID
const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AuditLog.findById(id)
      .populate("targetUserId", "username email")
      .populate("performedBy", "username email");

    if (!log) {
      return res.status(404).json({ error: "Audit log not found" });
    }

    res.json(log);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Get audit logs for specific user
const getAuditLogsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const logs = await AuditLog.find({ targetUserId: userId })
      .populate("targetUserId", "username email")
      .populate("performedBy", "username email")
      .sort({ timestamp: -1 });

    if (logs.length === 0) {
      return res.status(404).json({ message: "No audit logs found for this user" });
    }

    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Get audit logs by action type
const getAuditLogsByAction = async (req, res) => {
  try {
    const { action } = req.params;

    const validActions = [
      "USER_DELETED",
      "USER_DEACTIVATED",
      "USER_ACTIVATED",
      "ROLE_CREATED",
      "ROLE_MODIFIED",
      "ROLE_DELETED",
      "USER_ROLE_ASSIGNED"
    ];

    if (!validActions.includes(action)) {
      return res.status(400).json({ error: "Invalid action type" });
    }

    const logs = await AuditLog.find({ action })
      .populate("targetUserId", "username email")
      .populate("performedBy", "username email")
      .sort({ timestamp: -1 });

    if (logs.length === 0) {
      return res.status(404).json({ message: `No audit logs found for action: ${action}` });
    }

    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Get audit logs by admin (who performed the action)
const getAuditLogsByAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    const logs = await AuditLog.find({ performedBy: adminId })
      .populate("targetUserId", "username email")
      .populate("performedBy", "username email")
      .sort({ timestamp: -1 });

    if (logs.length === 0) {
      return res.status(404).json({ message: "No audit logs found for this admin" });
    }

    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getAllAuditLogs,
  getAuditLogById,
  createAuditLog,
  getAuditLogsByUser,
  getAuditLogsByAction,
  getAuditLogsByAdmin
};