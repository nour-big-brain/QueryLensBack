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
    queryDefinition: {
        type: mongoose.Schema.Types.Mixed,  
        required: true
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User"  
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
        required: false 
    }
}, {
    timestamps: true,  
    strict: false      
});

module.exports = mongoose.model("Query", querySchema);