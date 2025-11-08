const axios = require("axios");

// 1️⃣ Get Metabase session token
function getMetabaseSession() {
  return axios.post("http://localhost:3000/api/session", {
    username: process.env.EMAIL,
    password: process.env.PASSWORD,
  })
  .then(res => res.data.id)
  .catch(error => {
    console.error("Failed to get Metabase session:", error.response?.data || error.message);
    throw error;
  });
}

// 2️⃣ Get all databases from Metabase
function getAllMetabaseDatabases(token) {
  return axios.get("http://localhost:3000/api/database", {
    headers: { "X-Metabase-Session": token },
  })
  .then(res => res.data.data || res.data)
  .catch(error => {
    console.error("Failed to get Metabase databases:", error.response?.data || error.message);
    throw error;
  });
}

// 3️⃣ Get all collections from Metabase
function getAllMetabaseCollections(token) {
  return axios.get("http://localhost:3000/api/collection", {
    headers: { "X-Metabase-Session": token },
  })
  .then(res => {
    const collections = Array.isArray(res.data) ? res.data : res.data.data;
    return collections;
  })
  .catch(error => {
    console.error("Failed to get Metabase collections:", error.response?.data || error.message);
    throw error;
  });
}

// 4️⃣ Create a Metabase card (chart)
function createMetabaseCard(queryData, token, metabaseDbId, collectionId) {
  const payload = {
    name: queryData.title,
    description: queryData.description,
    dataset_query: {
      type: "query",
      database: metabaseDbId,
      query: queryData.queryDefinition
    },
    display: "table",
    visualization_settings: {},
    collection_id: collectionId
  };

  console.log("Payload for Metabase card:", JSON.stringify(payload, null, 2));

  return axios.post("http://localhost:3000/api/card", payload, {
    headers: { "X-Metabase-Session": token }
  })
  .then(res => res.data)
  .catch(error => {
    console.error("Error in createMetabaseCard:", error.response?.data || error.message);
    throw error;
  });
}

// 5️⃣ Get database metadata (tables and fields)
function getDatabaseMetadata(token, databaseId) {
  return axios.get(`http://localhost:3000/api/database/${databaseId}/metadata`, {
    headers: { "X-Metabase-Session": token }
  })
  .then(res => res.data)
  .catch(error => {
    console.error("Error fetching database metadata:", error.response?.data || error.message);
    throw error;
  });
}

module.exports = {
  getMetabaseSession,
  getAllMetabaseDatabases,
  getAllMetabaseCollections,
  createMetabaseCard,
  getDatabaseMetadata,
};