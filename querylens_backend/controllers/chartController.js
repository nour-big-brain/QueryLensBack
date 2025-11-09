const axios = require("axios");
const Query = require("../models/query");
const DataSource = require("../models/dataSource");

async function getMetabaseSession() {
  const res = await axios.post("http://localhost:3000/api/session", {
    username: process.env.EMAIL,
    password: process.env.PASSWORD
  });
  return res.data.id;
}

/**
 * Transform Metabase JSON response to a standardized chart format
 * @param {Object} metabaseData - Raw data from Metabase (array of objects)
 * @param {string} queryTitle - Title of the query
 * @param {string} chartType - Type of chart (bar, line, pie, etc.)
 * @returns {Object} Standardized chart payload
 */
function transformMetabaseData(metabaseData, queryTitle, chartType = "bar") {
  // Metabase returns an array of objects like:
  // [{ "Month": "2025-01", "Total Sales": 1500 }, { "Month": "2025-02", "Total Sales": 2000 }]
  
  if (!metabaseData || metabaseData.length === 0) {
    return {
      title: queryTitle,
      type: chartType,
      categories: [],
      series: []
    };
  }

  // Get column names from the first row
  const columns = Object.keys(metabaseData[0]);
  
  // First column is usually the category (X-axis)
  const categoryColumn = columns[0];
  const categories = metabaseData.map(row => row[categoryColumn]);

  // Remaining columns are data series (Y-axis values)
  const dataColumns = columns.slice(1);
  const series = dataColumns.map(colName => ({
    name: colName,
    values: metabaseData.map(row => row[colName])
  }));

  return {
    title: queryTitle,
    type: chartType,
    categories,
    series
  };
}

/**
 * Get chart data for a specific query
 * GET /api/charts/:queryId
 */
async function getChartData(req, res) {
  try {
    const { queryId } = req.params;
    const { chartType } = req.query; // Optional: allow frontend to specify chart type

    console.log("Fetching chart data for query:", queryId);

    // Find the saved query
    const savedQuery = await Query.findById(queryId).populate('dataSource');
    if (!savedQuery) {
      return res.status(404).json({ error: "Query not found" });
    }

    // Check if query has a Metabase card
    if (!savedQuery.metabaseCardId) {
      return res.status(400).json({ 
        error: "Query has no associated Metabase card",
        message: "This query hasn't been synced to Metabase yet"
      });
    }

    console.log("Query found:", {
      title: savedQuery.title,
      metabaseCardId: savedQuery.metabaseCardId
    });

    // Get Metabase session
    const token = await getMetabaseSession();

    // Execute the query in Metabase and get results
    console.log(`Fetching data from Metabase card: ${savedQuery.metabaseCardId}`);
    const metabaseRes = await axios.post(
      `http://localhost:3000/api/card/${savedQuery.metabaseCardId}/query/json`,
      {},
      { headers: { "X-Metabase-Session": token } }
    );

    console.log("Metabase response received:", {
      rowCount: metabaseRes.data?.length || 0,
      sample: metabaseRes.data?.[0],
      fullData: metabaseRes.data
    });

    // Check if we got data
    if (!metabaseRes.data || metabaseRes.data.length === 0) {
      return res.status(200).json({
        title: savedQuery.title,
        description: savedQuery.description,
        type: chartType || "bar",
        categories: [],
        series: [],
        message: "Query executed successfully but returned no data. Check if your table has data or if your query filters are too restrictive."
      });
    }

    // Transform to standardized chart format
    const chartPayload = transformMetabaseData(
      metabaseRes.data,
      savedQuery.title,
      chartType || savedQuery.type || "bar"
    );

    res.json(chartPayload);
  } catch (error) {
    console.error("Error fetching chart data:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: "Failed to get chart data",
      details: error.response?.data || error.message
    });
  }
}

/**
 * Get raw query results (without transformation)
 * GET /api/charts/:queryId/raw
 */
async function getRawQueryData(req, res) {
  try {
    const { queryId } = req.params;

    const savedQuery = await Query.findById(queryId);
    if (!savedQuery) {
      return res.status(404).json({ error: "Query not found" });
    }

    if (!savedQuery.metabaseCardId) {
      return res.status(400).json({ 
        error: "Query has no associated Metabase card"
      });
    }

    const token = await getMetabaseSession();

    const metabaseRes = await axios.post(
      `http://localhost:3000/api/card/${savedQuery.metabaseCardId}/query/json`,
      {},
      { headers: { "X-Metabase-Session": token } }
    );

    res.json({
      queryId: savedQuery._id,
      title: savedQuery.title,
      data: metabaseRes.data
    });
  } catch (error) {
    console.error("Error fetching raw data:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Failed to get raw data",
      details: error.response?.data || error.message
    });
  }
}

/**
 * Get database metadata to help build queries
 * GET /api/charts/metadata/:dataSourceId
 */
async function getDatabaseMetadata(req, res) {
  try {
    const { dataSourceId } = req.params;

    const ds = await DataSource.findById(dataSourceId);
    if (!ds) {
      return res.status(404).json({ error: "DataSource not found" });
    }

    const metabaseId = ds.metabaseDbId || ds.metabaseId;
    if (!metabaseId) {
      return res.status(400).json({ 
        error: "DataSource not synced to Metabase",
        message: "Please sync the DataSource first"
      });
    }

    const token = await getMetabaseSession();

    const metadata = await axios.get(
      `http://localhost:3000/api/database/${metabaseId}/metadata`,
      { headers: { "X-Metabase-Session": token } }
    );

    // Format for easy frontend use
    const formatted = {
      databaseId: metabaseId,
      databaseName: metadata.data.name,
      tables: metadata.data.tables.map(table => ({
        id: table.id,
        name: table.name,
        displayName: table.display_name,
        fields: table.fields.map(field => ({
          id: field.id,
          name: field.name,
          displayName: field.display_name,
          type: field.base_type,
          semanticType: field.semantic_type
        }))
      }))
    };

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching metadata:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Failed to fetch metadata",
      details: error.response?.data || error.message
    });
  }
}

module.exports = { 
  getChartData,
  getRawQueryData,
  getDatabaseMetadata
};