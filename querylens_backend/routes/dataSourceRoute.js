const express = require("express");
const router = express.Router();
const { createDataSource, syncDataSourceToMetabase, getDataSourceById } = require("../controllers/dataSourceController");

router.post("/", createDataSource);
router.post("/sync/:id", syncDataSourceToMetabase);
router.get("/:id", getDataSourceById);

module.exports = router;
