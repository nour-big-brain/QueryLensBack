require('dotenv').config();
const express = require('express');
const cors = require('cors');
const queryRoute = require('./routes/queryRoute');
const userRoute = require('./routes/userRoute');
const dataSourceRoute = require('./routes/dataSourceRoute');
const dashBoardRoute = require('./routes/dashboardRoute');
const chartRoute = require('./routes/chartRouter');
require('./connections');
require('dotenv').config();
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.use("/query", queryRoute);
app.use("/user", userRoute);
app.use("/dataSources", dataSourceRoute);
app.use("/dashboards", dashBoardRoute);
app.use("/charts", chartRoute);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
