const dashBoard = require('../models/dashboard');
const User = require('../models/user');
const axios = require('axios');

// ============================================
// HELPER: Check if user has access to dashboard
// ============================================
function checkDashboardAccess(dashboard, userId, requiredPermission = 'view') {
    // Owner always has full access
    if (dashboard.ownerId.toString() === userId) {
        return true;
    }
    
    // Check if dashboard is public
    if (dashboard.isPublic && requiredPermission === 'view') {
        return true;
    }
    
    // Check if user is in sharedWith list
    const userShare = dashboard.sharedWith.find(
        share => share.userId.toString() === userId
    );
    
    if (!userShare) return false;
    
    // Permission hierarchy: admin > edit > view
    const permissionLevels = { view: 1, edit: 2, admin: 3 };
    const userLevel = permissionLevels[userShare.permission] || 0;
    const requiredLevel = permissionLevels[requiredPermission] || 0;
    
    return userLevel >= requiredLevel;
}

// ============================================
// CREATE DASHBOARD 
// ============================================
async function createDashboard(req, res) {
    try {
        const { name, description, userId } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Dashboard name is required" });
        }

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const existingDashboard = await dashBoard.findOne({ name, ownerId: userId });
        if (existingDashboard) {
            return res.status(400).json({ error: "Dashboard with this name already exists" });
        }

        const newDashboard = new dashBoard({
            name,
            description,
            ownerId: userId,
            ownerName: user.username,
            createdAt: Date.now()
        });

        await newDashboard.save();

        res.status(200).json(newDashboard);

    } catch (error) {
        console.error("Error creating dashboard:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}


// ============================================
// GET ALL DASHBOARDS (filtered by access)
// ============================================
async function getDashboards(req, res) {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // Get dashboards the user owns, is shared with, or are public
        const dashboards = await dashBoard.find({
            $or: [
                { ownerId: userId },
                { 'sharedWith.userId': userId },
                { isPublic: true }
            ]
        }).select('-comments'); 
        
        res.status(200).json(dashboards);
    } catch (error) {
        console.error("Error fetching dashboards:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// ============================================
// GET DASHBOARD BY ID (with access check)
// ============================================
async function getDashboardById(req, res) {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const dashboardData = await dashBoard.findOne({ _id: id });
            
        if (!dashboardData) {
            return res.status(404).json({ error: "Dashboard not found" });
        }
        
        // Check access
        if (!checkDashboardAccess(dashboardData, userId, 'view')) {
            return res.status(403).json({ error: "Access denied" });
        }
        
        res.status(200).json(dashboardData);
        
    } catch (error) {
        console.error("Error fetching dashboard:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// ============================================
// UPDATE DASHBOARD
// ============================================
async function updateDashboard(req, res) {
    try {
        const { id } = req.params;
        const { name, description, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const dashboardData = await dashBoard.findOne({ _id: id });
        if (!dashboardData) {
            return res.status(404).json({ error: "Dashboard not found" });
        }

        if (!checkDashboardAccess(dashboardData, userId, 'edit')) {
            return res.status(403).json({ error: "You don't have permission to edit this dashboard" });
        }

        if (name) dashboardData.name = name;
        if (description !== undefined) dashboardData.description = description;
        dashboardData.updatedAt = Date.now();

        await dashboardData.save();
        res.status(200).json(dashboardData);

    } catch (error) {
        console.error("Error updating dashboard:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// ============================================
// DELETE DASHBOARD
// ============================================
async function deleteDashboard(req, res) {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const dashboardData = await dashBoard.findOne({ _id: id });
        if (!dashboardData) {
            return res.status(404).json({ error: "Dashboard not found" });
        }

        if (dashboardData.ownerId.toString() !== userId) {
            return res.status(403).json({ error: "Only the owner can delete this dashboard" });
        }

        await dashBoard.findOneAndDelete({ _id: id });
        res.status(200).json({ message: "Dashboard deleted successfully" });

    } catch (error) {
        console.error("Error deleting dashboard:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}


// ============================================
// ADD CARD TO DASHBOARD
// ============================================
async function addCardToDashboard(req, res) {
    try {
        const { dashboardId, cardId, userId } = req.body;

        if (!cardId) {
            return res.status(400).json({ error: "Card ID is required" });
        }

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const dashboard = await dashBoard.findOne({ _id: dashboardId });
        if (!dashboard) {
            return res.status(404).json({ error: "Dashboard not found" });
        }
        
        // Check edit permission
        if (!checkDashboardAccess(dashboard, userId, 'edit')) {
            return res.status(403).json({ error: "You don't have permission to edit this dashboard" });
        }

        // Initialize cards array if empty
        dashboard.cards = dashboard.cards || [];
        dashboard.cards.push(cardId);
        dashboard.updatedAt = Date.now();
        await dashboard.save();

        res.status(200).json({ 
            message: "Card added to dashboard", 
            dashboard
        });

    } catch (error) {
        console.error("Error adding card to dashboard:", error.response?.data || error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// ============================================
// REMOVE CARD FROM DASHBOARD
// ============================================
async function removeCardFromDashboard(req, res) {
    try {
        const { dashboardId, cardId, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const dashboard = await dashBoard.findOne({ _id: dashboardId });
        if (!dashboard) {
            return res.status(404).json({ error: "Dashboard not found" });
        }
        
        // Check edit permission
        if (!checkDashboardAccess(dashboard, userId, 'edit')) {
            return res.status(403).json({ error: "You don't have permission to edit this dashboard" });
        }

        // Remove card from local array
        dashboard.cards = (dashboard.cards || []).filter(id => id.toString() !== cardId);
        dashboard.updatedAt = Date.now();
        await dashboard.save();

        res.status(200).json({ message: "Card removed from dashboard", dashboard });

    } catch (error) {
        console.error("Error removing card from dashboard:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}


// ============================================
// SHARE DASHBOARD WITH USER
// ============================================
async function shareDashboard(req, res) {
  try {
    const { id } = req.params;
    const { targetUsername, permission, userId } = req.body;

    // Validate inputs
    if (!targetUsername || !permission || !userId) {
      return res.status(400).json({ 
        error: 'targetUsername, permission, and userId are required' 
      });
    }

    // Validate permission
    if (!['view', 'edit', 'admin'].includes(permission)) {
      return res.status(400).json({ 
        error: 'Invalid permission. Must be view, edit, or admin' 
      });
    }

    // Find the target user by username
    const targetUser = await User.findOne({ username: targetUsername });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent sharing with yourself
    if (targetUser._id.toString() === userId) {
      return res.status(400).json({ error: 'Cannot share dashboard with yourself' });
    }

    // Find the dashboard - USE dashBoard (lowercase d)
    const dashboard = await dashBoard.findById(id).populate('sharedWith.userId');
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    // Check if current user is owner or admin
    if (dashboard.ownerId.toString() !== userId) {
      const access = dashboard.sharedWith?.find(
        (s) => s.userId.toString() === userId
      );
      if (!access || access.permission !== 'admin') {
        return res.status(403).json({ 
          error: 'You do not have permission to share this dashboard' 
        });
      }
    }

    // Check if already shared with this user
    const existingShareIndex = dashboard.sharedWith?.findIndex(
      (s) => s.userId.toString() === targetUser._id.toString()
    );

    if (existingShareIndex !== undefined && existingShareIndex >= 0) {
      // Update existing share permission
      dashboard.sharedWith[existingShareIndex].permission = permission;
    } else {
      // Add new share
      if (!dashboard.sharedWith) {
        dashboard.sharedWith = [];
      }
      dashboard.sharedWith.push({
        userId: targetUser._id,
        permission: permission
      });
    }

    // Save the updated dashboard
    await dashboard.save();

    res.json({
      message: `Dashboard shared successfully with ${targetUsername}`,
      dashboard
    });
  } catch (e) {
    console.error('Error sharing dashboard:', e);
    res.status(500).json({ error: e.message });
  }
}



// ============================================
// MAKE DASHBOARD PUBLIC/PRIVATE
// ============================================
async function toggleDashboardPublic(req, res) {
    try {
        const { id } = req.params;
        const { isPublic, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const dashboard = await dashBoard.findOne({ _id: id });
        if (!dashboard) {
            return res.status(404).json({ error: "Dashboard not found" });
        }
        
        // Only owner can change public status
        if (dashboard.ownerId.toString() !== userId) {
            return res.status(403).json({ error: "Only the owner can change public status" });
        }
        
        dashboard.isPublic = isPublic;
        dashboard.updatedAt = Date.now();
        await dashboard.save();
        
        res.status(200).json({ 
            message: `Dashboard is now ${isPublic ? 'public' : 'private'}`, 
            dashboard 
        });
        
    } catch (error) {
        console.error("Error toggling dashboard public status:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// ============================================
// REMOVE SHARE ACCESS
// ============================================
async function removeShareAccess(req, res) {
    try {
        const { id, targetUserId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const dashboard = await dashBoard.findOne({ _id: id });
        if (!dashboard) {
            return res.status(404).json({ error: "Dashboard not found" });
        }
        
        // Only owner or the user themselves can remove access
        const isOwner = dashboard.ownerId.toString() === userId;
        const isSelf = targetUserId === userId;
        
        if (!isOwner && !isSelf) {
            return res.status(403).json({ error: "You don't have permission to remove this access" });
        }
        
        dashboard.sharedWith = dashboard.sharedWith.filter(
            share => share.userId.toString() !== targetUserId
        );
        
        dashboard.updatedAt = Date.now();
        await dashboard.save();
        
        res.status(200).json({ 
            message: "Share access removed successfully", 
            dashboard 
        });
        
    } catch (error) {
        console.error("Error removing share access:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// ============================================
// GET SHARED DASHBOARDS
// ============================================
async function getSharedDashboards(req, res) {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const dashboards = await dashBoard.find({
            'sharedWith.userId': userId
        }).select('-comments');
        
        res.status(200).json(dashboards);
    } catch (error) {
        console.error("Error fetching shared dashboards:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// ============================================
// ADD COMMENT TO DASHBOARD
// ============================================
async function addComment(req, res) {
    try {
        const { id } = req.params;
        const { text, userId } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: "Comment text is required" });
        }

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const dashboard = await dashBoard.findOne({ _id: id });
        if (!dashboard) {
            return res.status(404).json({ error: "Dashboard not found" });
        }
        
        // Check view permission (anyone who can view can comment)
        if (!checkDashboardAccess(dashboard, userId, 'view')) {
            return res.status(403).json({ error: "You don't have access to this dashboard" });
        }
        
        const newComment = {
            userId,
            username: user.username,
            text: text.trim(),
            createdAt: Date.now()
        };
        
        dashboard.comments.push(newComment);
        dashboard.updatedAt = Date.now();
        await dashboard.save();
        
        res.status(200).json({ 
            message: "Comment added successfully", 
            comment: newComment 
        });
        
    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// ============================================
// GET COMMENTS FOR DASHBOARD
// ============================================
async function getComments(req, res) {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const dashboard = await dashBoard.findOne({ _id: id })
            .select('comments ownerId sharedWith isPublic');
            
        if (!dashboard) {
            return res.status(404).json({ error: "Dashboard not found" });
        }
        
        // Check view permission
        if (!checkDashboardAccess(dashboard, userId, 'view')) {
            return res.status(403).json({ error: "You don't have access to this dashboard" });
        }
        
        res.status(200).json(dashboard.comments);
        
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// ============================================
// DELETE COMMENT
// ============================================
async function deleteComment(req, res) {
    try {
        const { id, commentId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const dashboard = await dashBoard.findOne({ _id: id });
        if (!dashboard) {
            return res.status(404).json({ error: "Dashboard not found" });
        }
        
        const comment = dashboard.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }
        
        // Only comment author or dashboard owner can delete
        const isCommentAuthor = comment.userId.toString() === userId;
        const isOwner = dashboard.ownerId.toString() === userId;
        
        if (!isCommentAuthor && !isOwner) {
            return res.status(403).json({ error: "You don't have permission to delete this comment" });
        }
        
        dashboard.comments.pull(commentId);
        dashboard.updatedAt = Date.now();
        await dashboard.save();
        
        res.status(200).json({ message: "Comment deleted successfully" });
        
    } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Add this function to your dashboardController.js

// ============================================
// GET DASHBOARDS BY SPECIFIC USER (owned only)
// ============================================
async function getDashboardsByUser(req, res) {
    try {
        const { userId } = req.params;
        const { userId: requestingUserId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        if (!requestingUserId) {
            return res.status(400).json({ error: "Requesting user ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Get dashboards owned by this specific user
        const dashboards = await dashBoard.find({
            ownerId: userId
        }).select('-comments');
        
        res.status(200).json(dashboards);
    } catch (error) {
        console.error("Error fetching user dashboards:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
// ============================================
// GET COMMENTS FOR DASHBOARD
// ============================================
async function getCommentsList(req, res) {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const dashboard = await dashBoard.findOne({ _id: id })
            .select('comments ownerId sharedWith isPublic');
            
        if (!dashboard) {
            return res.status(404).json({ error: "Dashboard not found" });
        }
        
        // Check view permission
        if (!checkDashboardAccess(dashboard, userId, 'view')) {
            return res.status(403).json({ error: "You don't have access to this dashboard" });
        }
        
        res.status(200).json(dashboard.comments);
        
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Make sure to add this to your module.exports
module.exports = {
    createDashboard,
    getDashboards,
    getDashboardsByUser,  // ADD THIS
    getDashboardById,
    getCommentsList,
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
};