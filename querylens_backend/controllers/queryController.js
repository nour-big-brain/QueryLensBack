const Query = require("../models/query");
const User = require("../models/user");
const DataSource = require("../models/dataSource");
const axios = require("axios");

// Define Metabase helper functions directly to avoid circular dependency
async function getMetabaseSession() {
  const res = await axios.post("http://localhost:3000/api/session", {
    username: process.env.EMAIL,
    password: process.env.PASSWORD,
  });
  return res.data.id;
}

async function getAllMetabaseDatabases(token) {
  const res = await axios.get("http://localhost:3000/api/database", {
    headers: { "X-Metabase-Session": token },
  });
  return res.data.data || res.data;
}

async function getAllMetabaseCollections(token) {
  const res = await axios.get("http://localhost:3000/api/collection", {
    headers: { "X-Metabase-Session": token },
  });
  return Array.isArray(res.data) ? res.data : res.data.data;
}

async function createMetabaseCard(queryData, token, metabaseDbId, collectionId) {
  const payload = {
    name: queryData.title,
    description: queryData.description || "",
    dataset_query: {
      type: "query",
      database: metabaseDbId,
      query: queryData.queryDefinition || {}
    },
    display: "table",
    visualization_settings: {},
    collection_id: collectionId
  };

  console.log("Query data received:", {
    title: queryData.title,
    hasQueryDefinition: !!queryData.queryDefinition,
    queryDefinition: queryData.queryDefinition
  });
  console.log("Payload for Metabase card:", JSON.stringify(payload, null, 2));

  const res = await axios.post("http://localhost:3000/api/card", payload, {
    headers: { "X-Metabase-Session": token }
  });

  return res.data;
}

async function buildQuery(req, res) {
  try {
    const { title, description, dataSource: dataSourceId, type, queryDefinition, userId } = req.body;

    //  Validate user
    console.log("Validating user with ID:", userId);
    const creator = await User.findById(userId);
    if (!creator) {
      console.error("User not found for ID:", userId);
      return res.status(400).json({ error: "User not found" });
    }

    // Validate required fields
    if (!title || !dataSourceId || !queryDefinition) {
      console.error("Missing required fields:", { title, dataSourceId, queryDefinition });
      return res.status(400).json({ error: "Title, DataSource, and QueryDefinition are required" });
    }

    //  Save locally in Mongo
    console.log("Saving query to MongoDB:", { title, dataSourceId });
    const newQuery = new Query({
      title,
      description,
      dataSource: dataSourceId,
      type,
      queryDefinition,
      createdBy: creator._id,
      createdAt: Date.now(),
    });
    await newQuery.save();
    console.log("Query saved to MongoDB with ID:", newQuery._id);

    //  Fetch DataSource from Mongo
    console.log("Fetching DataSource with ID:", dataSourceId);
    const selectedDataSource = await DataSource.findById(dataSourceId);
    if (!selectedDataSource) {
      console.error("DataSource not found for ID:", dataSourceId);
      return res.status(400).json({ error: "DataSource not found" });
    }

    //  Validate Metabase ID (support both field names)
    const metabaseId = selectedDataSource.metabaseDbId || selectedDataSource.metabaseId;
    console.log("DataSource document:", {
      id: selectedDataSource._id,
      name: selectedDataSource.name,
      metabaseDbId: selectedDataSource.metabaseDbId,
      metabaseId: selectedDataSource.metabaseId,
      usingValue: metabaseId
    });
    
    if (!metabaseId) {
      console.error("DataSource has not been synced to Metabase");
      return res.status(400).json({ 
        error: "DataSource has not been synced to Metabase",
        message: `Please sync the DataSource first by calling: POST /api/datasources/${dataSourceId}/sync`,
        dataSource: {
          id: selectedDataSource._id,
          name: selectedDataSource.name,
          metabaseDbId: selectedDataSource.metabaseDbId,
          metabaseId: selectedDataSource.metabaseId
        }
      });
    }
    
    const dbId = Number(metabaseId);
    console.log("Converted Metabase database ID:", dbId);
    
    if (isNaN(dbId) || dbId === 0) {
      console.error("Invalid Metabase ID for DataSource:", metabaseId);
      return res.status(400).json({ 
        error: "DataSource Metabase ID is invalid",
        details: `Metabase ID is ${metabaseId}, which converts to ${dbId}`
      });
    }

    //  Metabase session
    console.log("Fetching Metabase session");
    const token = await getMetabaseSession();
    console.log("Metabase session token obtained");

    // Log all Metabase databases (for debugging)
    const allDatabases = await getAllMetabaseDatabases(token);
    console.log("All Metabase Databases:", allDatabases.map(db => ({ id: db.id, name: db.name })));

    //  Get a collection ID
    console.log("Fetching Metabase collections");
    const collections = await getAllMetabaseCollections(token);
    const collection = collections.find(c => c.can_write && typeof c.id === "number") 
                      || collections.find(c => typeof c.id === "number");
    if (!collection) {
      console.error("No valid Metabase collection found:", collections);
      return res.status(400).json({ error: "No valid Metabase collection found" });
    }
    const collectionId = collection.id;
    console.log("Selected Metabase collection ID:", collectionId);

    //  Create card in Metabase
    console.log("Creating Metabase card for query:", newQuery._id);
    console.log("Query definition to send:", newQuery.queryDefinition);
    
    // Convert Mongoose document to plain object
    const queryObject = newQuery.toObject();
    
    const card = await createMetabaseCard(queryObject, token, dbId, collectionId);
    console.log("Metabase card created with ID:", card.id);

    //  Update local Mongo query with Metabase card ID
    newQuery.metabaseCardId = card.id;
    await newQuery.save();
    console.log("Query updated with Metabase card ID:", card.id);

    res.status(200).json(newQuery);
  } catch (error) {
    console.error("Error creating query:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

module.exports = {
  buildQuery
};