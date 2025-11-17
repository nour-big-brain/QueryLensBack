require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import middleware
const { authenticateToken, isAdmin } = require('./middlewares/auth');

// Import existing routes
const queryRoute = require('./routes/queryRoute');
const userRoute = require('./routes/userRoute');
const dataSourceRoute = require('./routes/dataSourceRoute');
const dashBoardRoute = require('./routes/dashboardRoute');
const chartRoute = require('./routes/chartRouter');

// Import new routes for auth/user management
const authRoute = require('./routes/authRoute');
const roleRoute = require('./routes/roleRoute');
const auditLogRoute = require('./routes/auditLogRoute');
const { testMetabaseLogin } = require('./services/metabaseService');

require('./connections');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// DEV MODE: Bypass auth for testing
// ============================================
const USE_AUTH = process.env.USE_AUTH !== 'false'; // Default: true (auth enabled)

// Middleware to simulate auth in dev mode
const devModeMiddleware = (req, res, next) => {
  if (!USE_AUTH) {
    // Development mode - simulate authenticated user
    req.userId = 'dev-user-id-12345';
    req.user = {
      _id: 'dev-user-id-12345',
      username: 'dev-user',
      email: 'dev@example.com',
      roleId: {
        permissions: [
          'user.delete',
          'user.deactivate',
          'user.activate',
          'role.create',
          'role.modify',
          'role.delete'
        ]
      }
    };
    console.log('🔓 Dev Mode: Auth bypassed');
    return next();
  }
  // Production mode - use real auth
  authenticateToken(req, res, next);
};

// Middleware
app.use(cors());
app.use(express.json());
//test

// Existing routes (no auth needed)
app.use("/query", queryRoute);
app.use("/user", userRoute);
app.use("/dataSources", dataSourceRoute);
app.use("/dashboards", dashBoardRoute);
app.use("/charts", chartRoute);

// Auth routes (no auth needed)
app.use("/auth", authRoute);
app.get("/metabase-test-login", testMetabaseLogin);

// Protected routes with dev mode support
app.use("/users", devModeMiddleware, USE_AUTH ? isAdmin : (req, res, next) => next(), userRoute);
app.use("/roles", devModeMiddleware, USE_AUTH ? isAdmin : (req, res, next) => next(), roleRoute);
app.use("/audit-logs", devModeMiddleware, USE_AUTH ? isAdmin : (req, res, next) => next(), auditLogRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  const mode = USE_AUTH ? '🔐 Production (Auth Enabled)' : '🔓 Development (Auth Disabled)';
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Mode: ${mode}`);
});

module.exports = app;