const express = require("express");
const router = express.Router();
const {
  createDataSource,
  syncDataSourceToMetabase,
  getDataSourceById,
  getAllDataSources,
  getDataSourceTables,
  getTableFields
} = require("../controllers/dataSourceController");

router.post("/datasources", createDataSource);
router.get("/datasources", getAllDataSources); 
router.get("/datasources/:id", getDataSourceById);
router.post("/datasources/:id/sync", syncDataSourceToMetabase);
router.get("/datasources/:id/tables", getDataSourceTables);
router.get("/datasources/:datasourceId/tables/:tableId/fields", getTableFields);

module.exports = router;
