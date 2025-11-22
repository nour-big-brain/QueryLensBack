const User = require("../models/user");
const AuditLog = require("../models/auditLog");
const { v4: uuidv4 } = require("uuid");

// Get all users (excluding soft deleted)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ deletedAt: null })
      .populate("roleId")
      .select("-password");

    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
// Get single user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .populate("roleId")
      .select("-password");

    if (!user || user.deletedAt) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Update user details
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password } = req.body;

    const user = await User.findById(id);

    if (!user || user.deletedAt) {
      return res.status(404).json({ error: "User not found" });
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if(password) user.password=password;

    await user.save();

    res.json({
      message: "User updated successfully",
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Deactivate user account
const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user || user.deletedAt) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.isActive) {
      return res.status(400).json({ error: "User is already deactivated" });
    }

    user.isActive = false;
    await user.save();

    // Create audit log
    const auditLog = new AuditLog({
      logId: uuidv4(),
      action: "USER_DEACTIVATED",
      targetUserId: user._id,
      performedBy: req.userId,
      details: { userId: user.userId, username: user.username }
    });
    await auditLog.save();

    res.json({
      message: "User deactivated successfully",
      user: {
        userId: user.userId,
        isActive: user.isActive
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Activate user account
const activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user || user.deletedAt) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isActive) {
      return res.status(400).json({ error: "User is already active" });
    }

    user.isActive = true;
    await user.save();

    // Create audit log
    const auditLog = new AuditLog({
      logId: uuidv4(),
      action: "USER_ACTIVATED",
      targetUserId: user._id,
      performedBy: req.userId,
      details: { userId: user.userId, username: user.username }
    });
    await auditLog.save();

    res.json({
      message: "User activated successfully",
      user: {
        userId: user.userId,
        isActive: user.isActive
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Soft delete user account
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.deletedAt) {
      return res.status(400).json({ error: "User is already deleted" });
    }

    user.deletedAt = new Date();
    user.isActive = false;
    await user.save();

    // Create audit log
    const auditLog = new AuditLog({
      logId: uuidv4(),
      action: "USER_DELETED",
      targetUserId: user._id,
      performedBy: req.userId,
      details: { userId: user.userId, username: user.username, deletedAt: user.deletedAt }
    });
    await auditLog.save();

    res.json({
      message: "User deleted successfully",
      user: {
        userId: user.userId,
        deletedAt: user.deletedAt
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Assign role to user
const assignRoleToUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ error: "Role ID is required" });
    }

    const user = await User.findById(id);
    if (!user || user.deletedAt) {
      return res.status(404).json({ error: "User not found" });
    }

    const previousRole = user.roleId;
    user.roleId = roleId;
    await user.save();

    // Create audit log
    const auditLog = new AuditLog({
      logId: uuidv4(),
      action: "USER_ROLE_ASSIGNED",
      targetUserId: user._id,
      performedBy: req.userId,
      details: { previousRole, newRole: roleId, username: user.username }
    });
    await auditLog.save();

    res.json({
      message: "Role assigned successfully",
      user: {
        userId: user.userId,
        username: user.username,
        roleId: user.roleId
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser,
  assignRoleToUser
};