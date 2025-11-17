const mongoose = require("mongoose");

const querySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: { 
        type: String 
    },
    metabaseCardId: { 
        type: Number 
    },
    dataSource: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "DataSource"  // Changed to match your model name
    },
    type: {
        type: String,
        enum: ["native", "builder", "ai"],
        default: "builder"
    },
    chartType: {
    type: String,
    enum: ['bar', 'line', 'area', 'pie', 'donut', 'radar', 'heatmap', 'scatter', 'mixed'],
    default: 'bar',
    required: true,
  },
    // Store the entire query definition as a flexible object
    queryDefinition: {
        type: mongoose.Schema.Types.Mixed,  // This allows any structure
        required: true
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User"  // Changed to match your model name
    },
    createdAt: {
        type: Date, 
        default: Date.now
    },
    updatedAt: {
        type: Date, 
        default: Date.now
    },
    dashboard:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Dashboard",
        required: false //change to true later
    }
}, {
    timestamps: true,  // Automatically manages createdAt and updatedAt
    strict: false      // Allow fields not in schema (for flexibility)
});

module.exports = mongoose.model("Query", querySchema);