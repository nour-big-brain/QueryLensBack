const Role = require("../models/role");
const User = require("../models/user");
const AuditLog = require("../models/auditLog");
const { v4: uuidv4 } = require("uuid");

// Create new role
const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Role name is required" });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: "Permissions must be an array" });
    }

    // Check if role already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ error: "Role already exists" });
    }

    const newRole = new Role({
      roleId: uuidv4(),
      name,
      description: description || "",
      permissions,
      createdBy: req.userId
    });

    await newRole.save();

    // Create audit log
    const auditLog = new AuditLog({
      logId: uuidv4(),
      action: "ROLE_CREATED",
      targetRoleId: newRole._id,
      performedBy: req.userId,
      details: { roleName: name, permissions }
    });
    await auditLog.save();

    res.status(201).json({
      message: "Role created successfully",
      role: {
        roleId: newRole.roleId,
        _id: newRole._id,
        name: newRole.name,
        description: newRole.description,
        permissions: newRole.permissions
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Get all roles
const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find();

    res.json(roles);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Get single role by ID
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    res.json(role);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Update role
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    const oldValues = {
      name: role.name,
      description: role.description,
      permissions: role.permissions
    };

    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (Array.isArray(permissions)) role.permissions = permissions;

    await role.save();

    // Create audit log
    const auditLog = new AuditLog({
      logId: uuidv4(),
      action: "ROLE_MODIFIED",
      targetRoleId: role._id,
      performedBy: req.userId,
      details: {
        oldValues,
        newValues: {
          name: role.name,
          description: role.description,
          permissions: role.permissions
        }
      }
    });
    await auditLog.save();

    res.json({
      message: "Role updated successfully",
      role: {
        roleId: role.roleId,
        name: role.name,
        description: role.description,
        permissions: role.permissions
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Add permission to role
const addPermissionToRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { permission } = req.body;

    if (!permission) {
      return res.status(400).json({ error: "Permission is required" });
    }

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    if (role.permissions.includes(permission)) {
      return res.status(400).json({ error: "Permission already exists in role" });
    }

    role.permissions.push(permission);
    await role.save();

    // Create audit log
    const auditLog = new AuditLog({
      logId: uuidv4(),
      action: "ROLE_MODIFIED",
      targetRoleId: role._id,
      performedBy: req.userId,
      details: { action: "permission_added", permission, roleName: role.name }
    });
    await auditLog.save();

    res.json({
      message: "Permission added successfully",
      role: {
        roleId: role.roleId,
        name: role.name,
        permissions: role.permissions
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Remove permission from role
const removePermissionFromRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { permission } = req.body;

    if (!permission) {
      return res.status(400).json({ error: "Permission is required" });
    }

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    if (!role.permissions.includes(permission)) {
      return res.status(400).json({ error: "Permission does not exist in role" });
    }

    role.permissions = role.permissions.filter(p => p !== permission);
    await role.save();

    // Create audit log
    const auditLog = new AuditLog({
      logId: uuidv4(),
      action: "ROLE_MODIFIED",
      targetRoleId: role._id,
      performedBy: req.userId,
      details: { action: "permission_removed", permission, roleName: role.name }
    });
    await auditLog.save();

    res.json({
      message: "Permission removed successfully",
      role: {
        roleId: role.roleId,
        name: role.name,
        permissions: role.permissions
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Delete role
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    // Check if any users are assigned to this role
    const usersWithRole = await User.countDocuments({ roleId: id });
    if (usersWithRole > 0) {
      return res.status(400).json({
        error: `Cannot delete role. ${usersWithRole} user(s) are assigned to this role.`
      });
    }

    const roleName = role.name;
    await Role.findByIdAndDelete(id);

    // Create audit log
    const auditLog = new AuditLog({
      logId: uuidv4(),
      action: "ROLE_DELETED",
      targetRoleId: id,
      performedBy: req.userId,
      details: { roleName, permissions: role.permissions }
    });
    await auditLog.save();

    res.json({
      message: "Role deleted successfully",
      roleId: role.roleId
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  addPermissionToRole,
  removePermissionFromRole,
  deleteRole
};