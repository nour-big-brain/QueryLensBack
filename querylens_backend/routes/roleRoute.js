const express = require("express");
const router = express.Router();
const {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  addPermissionToRole,
  removePermissionFromRole,
  deleteRole
} = require("../controllers/roleController");
const { authenticateToken, isAdmin } = require("../middlewares/auth");

router.post("/", authenticateToken, isAdmin, createRole);
router.get("/", authenticateToken, getAllRoles);
router.get("/:id", authenticateToken, getRoleById);
router.put("/:id", authenticateToken, isAdmin, updateRole);
router.post("/:id/permissions/add", authenticateToken, isAdmin, addPermissionToRole);
router.post("/:id/permissions/remove", authenticateToken, isAdmin, removePermissionFromRole);
router.delete("/:id", authenticateToken, isAdmin, deleteRole);

module.exports = router;