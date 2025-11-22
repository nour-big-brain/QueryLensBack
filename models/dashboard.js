const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: String, 
    text: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date
});

const shareSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: String, 
    permission: {
        type: String,
        enum: ['view', 'edit', 'admin'],
        default: 'view'
    },
    sharedAt: {
        type: Date,
        default: Date.now
    }
});

const dashboardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    metabaseDashboardId: Number,
    cards: [Number], 
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ownerName: String,

    isPublic: {
        type: Boolean,
        default: false
    },
    sharedWith: [shareSchema],

    comments: [commentSchema],

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date
});

dashboardSchema.index({ 'sharedWith.userId': 1 });
dashboardSchema.index({ ownerId: 1 });
dashboardSchema.index({ isPublic: 1 });

module.exports = mongoose.model('Dashboard', dashboardSchema);