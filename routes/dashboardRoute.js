const express = require("express");
const router = express.Router();
const {
    createDashboard,
    getDashboards,
    getDashboardById,
    getDashboardsByUser,
    updateDashboard,
    deleteDashboard,
    addCardToDashboard,
    removeCardFromDashboard,
    shareDashboard,
    toggleDashboardPublic,
    removeShareAccess,
    getSharedDashboards,
    addComment,
    deleteComment,
    getCommentsList
} = require("../controllers/dashboardController");

// ============================================
// DASHBOARD OPERATIONS
// ============================================

// Create dashboard
router.post("/create", createDashboard);

// Get all dashboards (owned, shared, public) - POST because it needs userId in body
router.post("/", getDashboards);

// Get dashboards owned by specific user - POST because it needs userId in body
router.post("/user/:userId", getDashboardsByUser);

// Get shared dashboards - POST because it needs userId in body
router.post("/shared", getSharedDashboards);

// Get dashboard by ID - POST because it needs userId in body
// IMPORTANT: This must come AFTER /user/:userId to avoid conflicts
router.post("/:id", getDashboardById);

// Update dashboard - PUT with userId in body
router.put("/:id", updateDashboard);

// Delete dashboard - DELETE with userId in body
router.delete("/:id", deleteDashboard);

// ============================================
// CARD OPERATIONS
// ============================================

// Add card to dashboard
router.post('/add-card', addCardToDashboard);

// Remove card from dashboard
router.post('/remove-card', removeCardFromDashboard);

// ============================================
// SHARING OPERATIONS
// ============================================

// Share dashboard with user
router.post('/:id/share', shareDashboard);

// Toggle dashboard public/private
router.put('/:id/public', toggleDashboardPublic);

// Remove share access
router.delete('/:id/share/:targetUserId', removeShareAccess);

// ============================================
// COMMENT OPERATIONS
// ============================================

// Get comments for dashboard - POST with userId in body
// IMPORTANT: This must come BEFORE the generic /:id/comments route
router.post('/:id/comments/list', getCommentsList);

// Add comment to dashboard - POST with text in body
router.post('/:id/comments', addComment);

// Delete comment
router.delete('/:id/comments/:commentId', deleteComment);

module.exports = router;