const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    required: true,
    unique: true
  },
  action: {
    type: String,
    required: true,
    enum: ["USER_DELETED", "USER_DEACTIVATED", "USER_ACTIVATED", "ROLE_CREATED", "ROLE_MODIFIED", "ROLE_DELETED", "USER_ROLE_ASSIGNED"]
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  targetRoleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    default: null
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("AuditLog", auditLogSchema);