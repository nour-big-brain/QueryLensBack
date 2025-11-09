require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import existing routes
const queryRoute = require('./routes/queryRoute');
const userRoute = require('./routes/userRoute');
console.log("userRoute:", userRoute);

const dataSourceRoute = require('./routes/dataSourceRoute');
const dashBoardRoute = require('./routes/dashboardRoute');
const chartRoute = require('./routes/chartRouter');

// Import new routes for auth/user management
const authRoute = require('./routes/authRoute');
console.log("authRoute:", authRoute);

const roleRoute = require('./routes/roleRoute');
console.log("roleRoute:", roleRoute);

const auditLogRoute = require('./routes/auditLogRoute');
console.log("auditLogRoute:", auditLogRoute);


require('./connections');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Existing routes
app.use("/query", queryRoute);
app.use("/user", userRoute);
app.use("/dataSources", dataSourceRoute);
app.use("/dashboards", dashBoardRoute);
app.use("/charts", chartRoute);

// New auth & user management routes
app.use("/auth", authRoute);
app.use("/users", userRoute);
app.use("/roles", roleRoute);
app.use("/audit-logs", auditLogRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;