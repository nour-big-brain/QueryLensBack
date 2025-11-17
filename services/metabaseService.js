const axios = require("axios");

// 1️⃣ Get Metabase session token
function getMetabaseSession() {
  return axios.post(`${process.env.METABASE_URL}/api/session`, {
    username: process.env.METABASE_EMAIL,      // ✅ Changed
    password: process.env.METABASE_PASSWORD,   // ✅ Changed
  })
  .then(res => res.data.id)
  .catch(error => {
    console.error("Failed to get Metabase session:", error.response?.data || error.message);
    throw error;
  });
}

async function testMetabaseLogin(req, res) {
  try {
    const response = await axios.post(
      `${process.env.METABASE_URL}/api/session`,  // ✅ Changed to /session
      {
        username: process.env.METABASE_EMAIL,      // ✅ Changed
        password: process.env.METABASE_PASSWORD    // ✅ Changed
      }
    );
    
    console.log("✅ Login successful!");
    console.log("User ID:", response.data.user_id);
    console.log("User email:", response.data.user?.email);
    console.log("Session token:", response.data.id);
    
    res.status(200).json({
      success: true,
      user: response.data.user,
      userId: response.data.user_id
    });
  } catch (error) {
    console.error("❌ Login failed!");
    console.error("Error:", error.response?.data || error.message);
    
    res.status(401).json({
      error: "Login failed",
      details: error.response?.data
    });
  }
}

// 2️⃣ Get all databases from Metabase
function getAllMetabaseDatabases(token) {
  return axios.get(`${process.env.METABASE_URL}/api/database`, {
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
  return axios.get(`${process.env.METABASE_URL}/api/collection`, {
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

  return axios.post(`${process.env.METABASE_URL}/api/card`, payload, {
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
  return axios.get(`${process.env.METABASE_URL}/api/database/${databaseId}/metadata`, {
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
  testMetabaseLogin
};