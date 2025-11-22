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
    enum: ["sql", "nosql", "api"], //adjust as needed
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
  timestamps: true,  // This automatically manages createdAt/updatedAt
  strict: false      // This allows fields not in schema to be saved (temporary for debugging)
});

module.exports = mongoose.model("DataSource", dataSourceSchema);