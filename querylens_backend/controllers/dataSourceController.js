const DataSource = require("../models/dataSource");
const { getMetabaseSession } = require("../services/metabaseService");
const axios = require("axios");

async function createDataSource(req, res) {
  try {
    const { name, type, connectionCredentials } = req.body;

    const newDataSource = new DataSource({
      name,
      type,
      connectionCredentials
    });

    await newDataSource.save();
    console.log("DataSource created with ID:", newDataSource._id);
    
    res.status(201).json(newDataSource);
  } catch (error) {
    console.error("Error creating data source:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function syncDataSourceToMetabase(req, res) {
  try {
    const { id } = req.params;
    console.log("Syncing DataSource ID:", id);
    
    const ds = await DataSource.findById(id);
    if (!ds) {
      console.error("DataSource not found for ID:", id);
      return res.status(404).json({ error: "DataSource not found" });
    }

    console.log("Found DataSource:", ds.name);
    console.log("Current metabaseDbId:", ds.metabaseDbId);

    const token = await getMetabaseSession();
    console.log("Got Metabase session token");

    // Create the database in Metabase
    const metabaseDb = await axios.post(
      "http://localhost:3000/api/database",
      {
        engine: "mysql",
        name: ds.name,
        details: {
          host: ds.connectionCredentials.host,
          port: ds.connectionCredentials.port,
          dbname: ds.connectionCredentials.database,
          user: ds.connectionCredentials.username,
          password: ds.connectionCredentials.password,
          ssl: false
        }
      },
      {
        headers: { "X-Metabase-Session": token }
      }
    );

    console.log("Metabase database created with ID:", metabaseDb.data.id);

    // Save both field names for compatibility
    ds.metabaseId = metabaseDb.data.id;
    ds.metabaseDbId = metabaseDb.data.id;
    await ds.save();
    
    console.log("DataSource updated, metabaseId now:", ds.metabaseId);
    console.log("DataSource updated, metabaseDbId now:", ds.metabaseDbId);

    // Verify it was saved
    const verifyDs = await DataSource.findById(id);
    console.log("Verification - metabaseId in DB:", verifyDs.metabaseId);
    console.log("Verification - metabaseDbId in DB:", verifyDs.metabaseDbId);

    res.status(200).json({
      message: "Database successfully added to Metabase",
      metabaseDb: metabaseDb.data,
      dataSource: {
        _id: ds._id,
        name: ds.name,
        metabaseId: ds.metabaseId,
        metabaseDbId: ds.metabaseDbId
      }
    });
  } catch (error) {
    console.error("Error syncing database:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Failed to sync database to Metabase",
      details: error.response?.data || error.message
    });
  }
}

async function getDataSourceById(req, res) {
  try {
    const { id } = req.params;
    const ds = await DataSource.findById(id);
    
    if (!ds) {
      return res.status(404).json({ error: "DataSource not found" });
    }

    console.log("DataSource fields:", Object.keys(ds.toObject()));
    console.log("metabaseDbId value:", ds.metabaseDbId);
    console.log("metabaseId value:", ds.metabaseId);
    
    res.status(200).json(ds);
  } catch (error) {
    console.error("Error fetching DataSource:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { 
  createDataSource,
  syncDataSourceToMetabase,
  getDataSourceById
};