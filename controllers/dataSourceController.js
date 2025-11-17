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
    
    // ✅ Get MySQL credentials from request body
    const { host, port, database, username, password } = req.body;
    
    console.log("Syncing DataSource ID:", id);
    
    const ds = await DataSource.findById(id);
    if (!ds) {
      return res.status(404).json({ error: "DataSource not found" });
    }

    console.log("Found DataSource:", ds.name);

    const token = await getMetabaseSession();
    console.log("Got Metabase session token");

    let metabaseDbId = ds.metabaseDbId;

    if (metabaseDbId) {
      // UPDATE existing
      await axios.put(
        `http://localhost:3000/api/database/${metabaseDbId}`,
        {
          engine: "mysql",
          name: ds.name,
          details: {
            host: host,              
            port: port,                          
            dbname: database,        
            user: username,          
            password: password,      
            ssl: false
          }
        },
        {
          headers: { "X-Metabase-Session": token }
        }
      );
    } else {
      // CREATE new
      const metabaseDb = await axios.post(
        "http://localhost:3000/api/database",
        {
          engine: "mysql",
          name: ds.name,
          details: {
            host: host,             
            port: port,             
            dbname: database,         
            user: username,          
            password: password,       
            ssl: false
          }
        },
        {
          headers: { "X-Metabase-Session": token }
        }
      );

      metabaseDbId = metabaseDb.data.id;
    }

    ds.metabaseId = metabaseDbId;
    ds.metabaseDbId = metabaseDbId;
    await ds.save();

    res.status(200).json({
      message: "Database successfully synced to Metabase",
      metabaseDbId: metabaseDbId,
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
}// Add these methods to your datasourceController.js

// 1️⃣ Get all data sources (for dropdown)
async function getAllDataSources(req, res) {
  try {
    const dataSources = await DataSource.find().select('_id name metabaseDbId metabaseId');
    
    console.log("Fetching all DataSources:", dataSources.length);
    
    res.status(200).json(dataSources);
  } catch (error) {
    console.error("Error fetching data sources:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// 2️⃣ Get tables for a specific data source from Metabase
async function getDataSourceTables(req, res) {
  try {
    const { id } = req.params;
    
    // Get the DataSource to find its Metabase ID
    const ds = await DataSource.findById(id);
    if (!ds) {
      return res.status(404).json({ error: "DataSource not found" });
    }

    const metabaseDbId = ds.metabaseDbId || ds.metabaseId;
    if (!metabaseDbId) {
      return res.status(400).json({ 
        error: "DataSource has not been synced to Metabase yet",
        message: `Please sync this DataSource first`
      });
    }

    // Get Metabase session
    const token = await getMetabaseSession();

    // Fetch metadata (tables) from Metabase
    const response = await axios.get(
      `http://localhost:3000/api/database/${metabaseDbId}/metadata`,
      {
        headers: { "X-Metabase-Session": token }
      }
    );

    // Extract tables in user-friendly format
    const tables = response.data.tables.map(table => ({
      id: table.id,
      name: table.name,
      displayName: table.display_name || table.name,
      description: table.description || ''
    }));

    console.log(`Found ${tables.length} tables for DataSource ${id}`);

    res.status(200).json({
      dataSourceId: id,
      dataSourceName: ds.name,
      tables: tables
    });
  } catch (error) {
    console.error("Error fetching tables:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Failed to fetch tables",
      details: error.message
    });
  }
}

// 3️⃣ Get fields for a specific table (optional - for advanced filtering)
async function getTableFields(req, res) {
  try {
    const { datasourceId, tableId } = req.params;

    const ds = await DataSource.findById(datasourceId);
    if (!ds) {
      return res.status(404).json({ error: "DataSource not found" });
    }

    const metabaseDbId = ds.metabaseDbId || ds.metabaseId;
    if (!metabaseDbId) {
      return res.status(400).json({ error: "DataSource not synced to Metabase" });
    }

    const token = await getMetabaseSession();

    // Fetch table metadata
    const response = await axios.get(
      `http://localhost:3000/api/table/${tableId}`,
      {
        headers: { "X-Metabase-Session": token }
      }
    );

    const fields = response.data.fields.map(field => ({
      id: field.id,
      name: field.name,
      displayName: field.display_name || field.name,
      type: field.base_type
    }));

    console.log(`Found ${fields.length} fields for table ${tableId}`);

    res.status(200).json({
      tableId: tableId,
      tableName: response.data.name,
      fields: fields
    });
  } catch (error) {
    console.error("Error fetching table fields:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Failed to fetch table fields",
      details: error.message
    });
  }
}

module.exports = { 
  createDataSource,
  syncDataSourceToMetabase,
  getDataSourceById,
  getAllDataSources,        
  getDataSourceTables,      // ✅ NEW
  getTableFields            // ✅ NEW
};