const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Role = require("../models/role");
const mongoose = require("mongoose");

// Check if dev mode is enabled
const USE_AUTH = process.env.USE_AUTH !== 'false';

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    // Dev mode - bypass authentication
    if (!USE_AUTH) {
      // Create a valid MongoDB ObjectId for dev mode
      const devObjectId = new mongoose.Types.ObjectId();
      
      req.userId = devObjectId;
      req.user = {
        _id: devObjectId,
        username: 'dev-user',
        email: 'dev@example.com',
        roleId: {
          permissions: [
            'user.delete',
            'user.deactivate',
            'user.activate',
            'role.create',
            'role.modify',
            'role.delete'
          ]
        }
      };
      console.log('🔓 Dev Mode: Auth bypassed for', req.path);
      return next();
    }

    // Production mode - verify token
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    req.userId = decoded.userId;
    req.user = await User.findById(decoded.userId).populate("roleId");
    next();
  } catch (e) {
    res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Check if user has specific permissions
const authorizePermission = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Dev mode - skip permission check
      if (!USE_AUTH) {
        return next();
      }

      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const userRole = req.user.roleId;
      
      if (!userRole) {
        return res.status(403).json({ error: "User has no role assigned" });
      }

      const hasPermission = requiredPermissions.some(perm => 
        userRole.permissions.includes(perm)
      );

      if (!hasPermission) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      next();
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };
};

// Check if user is admin (has admin role)
const isAdmin = (req, res, next) => {
  try {
    // Dev mode - allow all
    if (!USE_AUTH) {
      return next();
    }

    if (!req.user) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Allow first user (admin) even if no role assigned yet
    const isFirstUser = req.user._id && !req.user.roleId;
    
    if (isFirstUser) {
      return next();
    }

    if (!req.user.roleId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check if role has any admin permission
    const adminPermissions = ["user.delete", "user.deactivate", "user.activate", "role.create", "role.modify", "role.delete"];
    const isAdminUser = adminPermissions.some(perm => 
      req.user.roleId.permissions.includes(perm)
    );

    if (!isAdminUser) {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  authenticateToken,
  authorizePermission,
  isAdmin
};