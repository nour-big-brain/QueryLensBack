express = require("express");
const router = express.Router();

const {
    createDashboard,
    getDashboards,
    getDashboardById,
    updateDashboard,
    deleteDashboard,
    addCardToDashboard,
    removeCardFromDashboard,
    shareDashboard,
    toggleDashboardPublic,
    removeShareAccess,
    getSharedDashboards,
    addComment,
    getComments,
    deleteComment
} = require("../controllers/dashboardController");



router.get("/", getDashboards);
router.get("/:id", getDashboardById);
router.post("/create", createDashboard);
router.put("/update/:id", updateDashboard);
router.delete("/delete/:id", deleteDashboard);

// Card routes
router.post('/add-card', addCardToDashboard);
router.post('/remove-card', removeCardFromDashboard);

// Share routes
// router.post('/:id/share', authenticateUser, shareDashboard);
router.post('/:id/share', shareDashboard);
router.put('/:id/public', toggleDashboardPublic);
router.delete('/:id/share/:targetUserId', removeShareAccess);
router.get('/shared/with-me', getSharedDashboards);

// Comment routes
// router.post('/:id/comments', authenticateUser, addComment);
router.post('/:id/comments', addComment);
router.get('/:id/comments', getComments);
router.delete('/:id/comments/:commentId', deleteComment);

module.exports = router;