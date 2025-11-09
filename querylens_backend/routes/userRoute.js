const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser,
  assignRoleToUser
} = require("../controllers/userController");
const { authenticateToken, isAdmin } = require("../middlewares/auth");

router.get("/", authenticateToken, isAdmin, getAllUsers);
router.get("/:id", authenticateToken, getUserById);
router.put("/:id", authenticateToken, updateUser);
router.patch("/:id/deactivate", authenticateToken, isAdmin, deactivateUser);
router.patch("/:id/activate", authenticateToken, isAdmin, activateUser);
router.delete("/:id", authenticateToken, isAdmin, deleteUser);
router.patch("/:id/assign-role", authenticateToken, isAdmin, assignRoleToUser);

module.exports = router;