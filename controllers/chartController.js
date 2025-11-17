const axios = require("axios");
const Query = require("../models/query");
const DataSource = require("../models/dataSource");

async function getMetabaseSession() {
  const res = await axios.post("http://localhost:3000/api/session", {
    username: process.env.METABASE_EMAIL,
    password: process.env.METABASE_PASSWORD,
  });
  return res.data.id;
}

/**
 * Check if a value is numeric
 */
function isNumericValue(value) {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'number') return true;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  }
  return false;
}

/**
 * Transform Metabase JSON response to a standardized chart format
 */
function transformMetabaseData(metabaseData, queryTitle, chartType = "bar") {
  console.log('=== transformMetabaseData START ===');
  console.log('Input data length:', metabaseData?.length);
  console.log('Input chartType:', chartType);
  
  if (!metabaseData || metabaseData.length === 0) {
    console.log('No data, returning empty chart');
    return {
      title: queryTitle,
      type: chartType,
      categories: [],
      series: [],
      message: "No data available"
    };
  }

  const columns = Object.keys(metabaseData[0]);
  console.log('Columns found:', columns);

  // Analyze each column to find numeric ones
  const columnAnalysis = {};
  columns.forEach(col => {
    const values = metabaseData.map(row => row[col]);
    const numericCount = values.filter(v => isNumericValue(v)).length;
    const totalCount = values.length;
    
    columnAnalysis[col] = {
      numericCount,
      totalCount,
      isNumeric: numericCount > 0,
      sample: values[0]
    };
  });

  console.log('Column analysis:', columnAnalysis);

  // Find numeric and non-numeric columns
  const numericColumns = Object.keys(columnAnalysis).filter(col => columnAnalysis[col].isNumeric);
  const nonNumericColumns = Object.keys(columnAnalysis).filter(col => !columnAnalysis[col].isNumeric);

  console.log('Numeric columns:', numericColumns);
  console.log('Non-numeric columns:', nonNumericColumns);

  let categories = [];
  let series = [];

  // Strategy 1: If we have both numeric and non-numeric columns
  if (numericColumns.length > 0 && nonNumericColumns.length > 0) {
    console.log('Strategy 1: Mixed data (numeric + non-numeric)');
    
    // Use first non-numeric column as categories
    const categoryColumn = nonNumericColumns[0];
    categories = metabaseData.map(row => String(row[categoryColumn]).substring(0, 50)); // Truncate long strings
    
    // Use all numeric columns as series
    series = numericColumns.map(colName => ({
      name: colName,
      values: metabaseData.map(row => {
        const val = row[colName];
        const num = isNumericValue(val) ? parseFloat(val) : 0;
        return num;
      })
    }));
  }
  // Strategy 2: Only numeric columns
  else if (numericColumns.length >= 2) {
    console.log('Strategy 2: All numeric columns');
    
    const categoryColumn = numericColumns[0];
    categories = metabaseData.map((row, idx) => String(row[categoryColumn]) || `Item ${idx + 1}`);
    
    series = numericColumns.slice(1).map(colName => ({
      name: colName,
      values: metabaseData.map(row => {
        const val = row[colName];
        return isNumericValue(val) ? parseFloat(val) : 0;
      })
    }));

    // If only one numeric column, add a series from it
    if (series.length === 0) {
      series = [{
        name: numericColumns[0],
        values: metabaseData.map(row => parseFloat(row[numericColumns[0]]) || 0)
      }];
    }
  }
  // Strategy 3: Only non-numeric columns or single numeric - create count chart
  else {
    console.log('Strategy 3: Non-numeric or insufficient data for chart');
    
    // Show first 10 rows as categories
    categories = metabaseData.slice(0, Math.min(10, metabaseData.length))
      .map((row, idx) => {
        const firstCol = columns[0];
        return String(row[firstCol]).substring(0, 30) || `Row ${idx + 1}`;
      });
    
    series = [{
      name: 'Count',
      values: Array(categories.length).fill(1)
    }];
  }

  console.log('Final chart data:', {
    categoriesLength: categories.length,
    seriesCount: series.length,
    seriesNames: series.map(s => s.name)
  });

  const result = {
    title: queryTitle,
    type: chartType,
    categories: categories || [],
    series: series || []
  };

  console.log('=== transformMetabaseData END ===');
  return result;
}

/**
 * Get chart data for a specific query
 * GET /api/charts/:queryId
 */
async function getChartData(req, res) {
  try {
    const { queryId } = req.params;
    const { chartType } = req.query;

    console.log("\n========== CHART REQUEST START ==========");
    console.log("Fetching chart data for query:", queryId);
    console.log("Requested chartType:", chartType);

    // Find the saved query
    const savedQuery = await Query.findById(queryId).populate('dataSource');
    if (!savedQuery) {
      console.log('Query not found');
      return res.status(404).json({ error: "Query not found" });
    }

    console.log("Query found:", {
      title: savedQuery.title,
      type: savedQuery.type,
      chartType: savedQuery.chartType,
      metabaseCardId: savedQuery.metabaseCardId
    });

    // Check if query has a Metabase card
    if (!savedQuery.metabaseCardId) {
      console.log('No metabaseCardId');
      return res.status(400).json({ 
        error: "Query has no associated Metabase card",
        message: "This query hasn't been synced to Metabase yet"
      });
    }

    // Get Metabase session
    console.log('Getting Metabase session...');
    const token = await getMetabaseSession();

    // Execute the query in Metabase and get results
    console.log(`Executing Metabase card: ${savedQuery.metabaseCardId}`);
    const metabaseRes = await axios.post(
      `http://localhost:3000/api/card/${savedQuery.metabaseCardId}/query/json`,
      {},
      { headers: { "X-Metabase-Session": token } }
    );

    const rawData = metabaseRes.data;
    console.log("Raw Metabase response:", {
      rowCount: rawData?.length || 0,
      columns: rawData?.[0] ? Object.keys(rawData[0]) : 'N/A',
      firstRow: rawData?.[0]
    });

    // Check if we got data
    if (!rawData || rawData.length === 0) {
      console.log('No data returned from Metabase');
      return res.status(200).json({
        title: savedQuery.title,
        description: savedQuery.description,
        type: chartType || savedQuery.chartType || "bar",
        categories: [],
        series: [],
        message: "Query executed but returned no data"
      });
    }

    // Determine final chart type
    const finalChartType = chartType || savedQuery.chartType || "bar";
    console.log("Final chart type:", finalChartType);
    
    // Transform to standardized chart format
    const chartPayload = transformMetabaseData(rawData, savedQuery.title, finalChartType);
    
    chartPayload.description = savedQuery.description;

    console.log("Sending chart payload:", {
      title: chartPayload.title,
      type: chartPayload.type,
      categoriesCount: chartPayload.categories.length,
      seriesCount: chartPayload.series.length,
      firstCategory: chartPayload.categories[0],
      seriesNames: chartPayload.series.map(s => s.name)
    });

    console.log("========== CHART REQUEST END ==========\n");
    res.json(chartPayload);
  } catch (error) {
    console.error("========== ERROR ==========");
    console.error("Error message:", error.message);
    console.error("Error response:", error.response?.data);
    console.error("Stack:", error.stack);
    console.error("========== ERROR END ==========\n");
    
    res.status(500).json({ 
      error: "Failed to get chart data",
      details: error.response?.data?.error_description || error.message
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