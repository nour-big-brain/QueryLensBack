const mongoose = require("mongoose");

const dataSourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ["sql", "nosql", "api"], 
  },
  connectionCredentials: {
    host: String,
    port: Number,
    username: String,
    password: String,
    database: String
  },
  metabaseDbId: {  
    type: Number,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,  
  strict: false      
});

module.exports = mongoose.model("DataSource", dataSourceSchema);