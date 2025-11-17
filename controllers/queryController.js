const Query = require("../models/query");
const User = require("../models/user");
const DataSource = require("../models/dataSource");
const axios = require("axios");

// ==================== METABASE HELPERS ====================

async function getMetabaseSession() {
  const res = await axios.post(`${process.env.METABASE_URL}/api/session`, {
    username: process.env.METABASE_EMAIL,
    password: process.env.METABASE_PASSWORD,
  });
  return res.data.id;
}

async function getAllMetabaseCollections(token) {
  const res = await axios.get("http://localhost:3000/api/collection", {
    headers: { "X-Metabase-Session": token },
  });
  return Array.isArray(res.data) ? res.data : res.data.data;
}

async function createMetabaseCard(queryData, token, metabaseDbId, collectionId) {
  console.log("Creating Metabase card with:", {
    title: queryData.title,
    chartType: queryData.chartType,
    metabaseDbId,
    collectionId,
    queryDefinition: queryData.queryDefinition
  });

  const chartTypeToDisplay = {
    bar: "bar",
    line: "line",
    area: "area",
    pie: "pie",
    donut: "pie",
    scatter: "scatter",
    radar: "radar",
    heatmap: "heatmap",
    mixed: "bar",
    table: "table"
  };

  const displayType = chartTypeToDisplay[queryData.chartType] || "table";

  const visualizationSettings = {};
  if (queryData.chartType === "donut") {
    visualizationSettings["pie.type"] = "donut";
  }
  if (queryData.chartType === "pie" || queryData.chartType === "donut") {
    visualizationSettings["pie.show_legend"] = true;
    visualizationSettings["graph.show_values"] = true;
  }

  const payload = {
    name: queryData.title.trim(),
    description: queryData.description || "",
    dataset_query: {
      type: "query",
      database: metabaseDbId,
      query: queryData.queryDefinition || {}
    },
    display: displayType,
    visualization_settings: visualizationSettings,
    collection_id: collectionId  // ← null = Root, number = real collection
  };

  console.log("Payload for Metabase card:", JSON.stringify(payload, null, 2));

  try {
    const res = await axios.post("http://localhost:3000/api/card", payload, {
      headers: { "X-Metabase-Session": token }
    });

    console.log("Metabase card created successfully:", {
      cardId: res.data.id,
      display: res.data.display,
      collection_id: res.data.collection_id
    });

    return res.data;
  } catch (error) {
    console.error("Metabase API Error:", error.response?.data || error.message);
    throw error;
  }
}

// ==================== BUILD QUERY ====================

async function buildQuery(req, res) {
  try {
    console.log("========== BUILD QUERY START ==========");
    const { title, description, dataSource, type, chartType, queryDefinition, userId } = req.body;

    console.log("Request body:", {
      title,
      description,
      dataSource,
      type,
      chartType,
      hasQueryDefinition: !!queryDefinition,
      userId
    });

    if (!title || !dataSource || !userId) {
      return res.status(400).json({ error: 'Missing required fields: title, dataSource, userId' });
    }

    const validChartTypes = ['bar', 'line', 'area', 'pie', 'donut', 'radar', 'heatmap', 'scatter', 'mixed'];
    if (!chartType || !validChartTypes.includes(chartType)) {
      return res.status(400).json({
        error: 'Invalid chart type. Must be one of: ' + validChartTypes.join(', ')
      });
    }

    const query = new Query({
      title,
      description,
      dataSource,
      type: type || 'builder',
      chartType,
      queryDefinition,
      createdBy: userId,
    });

    await query.save();
    const savedQuery = await query.populate('dataSource');

    console.log("Query saved to MongoDB:", {
      queryId: query._id,
      title: query.title,
      dataSourceName: savedQuery.dataSource.name
    });

    // === METABASE SYNC ===
    try {
      console.log("\n--- Attempting Metabase Sync ---");
      const token = await getMetabaseSession();
      console.log("Metabase session token obtained");

      const metabaseDbId = savedQuery.dataSource.metabaseDbId;
      if (!metabaseDbId) {
        throw new Error(`DataSource "${savedQuery.dataSource.name}" has no Metabase database ID`);
      }
      console.log("Metabase database ID found:", metabaseDbId);

      const collections = await getAllMetabaseCollections(token);

      // CRITICAL FIX: Only use "Nos analyses" if it has a REAL numeric ID (not "root")
      const targetCollection = collections.find(
        c => c.name === "Nos analyses" && typeof c.id === "number"
      );

      const collectionId = targetCollection ? targetCollection.id : null;

      console.log("Using collection:", 
        targetCollection 
          ? `"${targetCollection.name}" (ID: ${targetCollection.id})` 
          : "Root collection (collection_id: null)"
      );

      const metabaseCard = await createMetabaseCard(query, token, metabaseDbId, collectionId);

      query.metabaseCardId = metabaseCard.id;
      await query.save();

      console.log("Query successfully synced to Metabase! Card ID:", metabaseCard.id);
      console.log("========== BUILD QUERY END (SUCCESS) ==========\n");

      res.status(201).json(query);

    } catch (metabaseError) {
      console.error("Metabase sync failed:", metabaseError.message);
      console.log("Note: Query saved to MongoDB but NOT synced to Metabase");
      console.log("========== BUILD QUERY END (PARTIAL) ==========\n");

      res.status(201).json({
        ...query.toObject(),
        metabaseError: metabaseError.message
      });
    }

  } catch (error) {
    console.error("BUILD QUERY ERROR:", error.message);
    res.status(500).json({ error: 'Failed to create query', details: error.message });
  }
}

// ==================== RETRY SYNC ====================

async function retryMetabaseSync(req, res) {
  try {
    console.log("========== RETRY METABASE SYNC START ==========");
    const { queryId } = req.params;
    if (!queryId) return res.status(400).json({ error: 'Query ID is required' });

    const query = await Query.findById(queryId).populate('dataSource');
    if (!query) return res.status(404).json({ error: 'Query not found' });
    if (query.metabaseCardId) {
      return res.status(200).json({ message: 'Already synced', metabaseCardId: query.metabaseCardId });
    }

    console.log("Retrying sync for query:", query.title);

    const token = await getMetabaseSession();
    console.log("Metabase session obtained");

    const metabaseDbId = query.dataSource.metabaseDbId;
    if (!metabaseDbId) throw new Error("No database ID in data source");

    const collections = await getAllMetabaseCollections(token);

    // SAME CRITICAL FIX HERE
    const targetCollection = collections.find(
      c => c.name === "Nos analyses" && typeof c.id === "number"
    );

    const collectionId = targetCollection ? targetCollection.id : null;

    console.log("Using collection:", 
      targetCollection 
        ? `"${targetCollection.name}" (ID: ${targetCollection.id})` 
        : "Root collection (collection_id: null)"
    );

    const metabaseCard = await createMetabaseCard(query, token, metabaseDbId, collectionId);

    query.metabaseCardId = metabaseCard.id;
    await query.save();

    console.log("Query synced on retry! Card ID:", metabaseCard.id);
    console.log("========== RETRY METABASE SYNC END (SUCCESS) ==========\n");

    res.status(200).json({ message: 'Synced successfully', metabaseCardId: metabaseCard.id });

  } catch (error) {
    console.error("RETRY SYNC FAILED:", error.message);
    res.status(500).json({ error: 'Failed to sync', details: error.message });
  }
}

// ==================== OTHER ENDPOINTS ====================

async function assignQueryToDashboard(req, res) {
  try {
    const { queryId, dashboardId } = req.body;
    const query = await Query.findById(queryId);
    if (!query) return res.status(404).json({ error: "Query not found" });

    query.dashboard = dashboardId;
    await query.save();

    res.status(200).json({ message: "Query assigned to dashboard", query });
  } catch (error) {
    res.status(500).json({ error: "Failed to assign", details: error.message });
  }
}

async function getQueriesByDashboardId(req, res) {
  try {
    const { dashboardId } = req.params;
    if (!dashboardId || dashboardId.length !== 24) {
      return res.status(400).json({ error: "Valid dashboardId required" });
    }

    const queries = await Query.find({ dashboard: dashboardId })
      .populate("dataSource", "name")
      .populate("createdBy", "username")
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${queries.length} queries for dashboard ${dashboardId}`);
    res.status(200).json(queries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch queries", details: error.message });
  }
}

module.exports = {
  buildQuery,
  retryMetabaseSync,
  assignQueryToDashboard,
  getQueriesByDashboardId
};