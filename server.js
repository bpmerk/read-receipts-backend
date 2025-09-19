// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// In-memory storage: { channelId: { messageId: { userId: timestamp } } }
const receipts = {};

// SSE clients: { channelId: [res1, res2, ...] }
const clients = {};

// POST /read - user reports reading a message
app.post("/read", (req, res) => {
  const { userId, channelId, messageId, timestamp } = req.body;

  if (!userId || !channelId || !messageId || !timestamp) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!receipts[channelId]) receipts[channelId] = {};
  if (!receipts[channelId][messageId]) receipts[channelId][messageId] = {};
  receipts[channelId][messageId][userId] = timestamp;

  // Notify SSE clients
  if (clients[channelId]) {
    const data = JSON.stringify(receipts[channelId]);
    clients[channelId].forEach(client => client.write(`data: ${data}\n\n`));
  }

  res.json({ success: true });
});

// GET /status/:channelId - get all read receipts for a channel
app.get("/status/:channelId", (req, res) => {
  const { channelId } = req.params;
  const channelReceipts = receipts[channelId] || {};
  res.json(channelReceipts);
});

// GET /updates/:channelId - SSE endpoint
app.get("/updates/:channelId", (req, res) => {
  const { channelId } = req.params;

  // Set headers for SSE
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });
  res.flushHeaders();

  // Send initial data immediately
  const initialData = JSON.stringify(receipts[channelId] || {});
  res.write(`data: ${initialData}\n\n`);

  if (!clients[channelId]) clients[channelId] = [];
  clients[channelId].push(res);

  // Remove client when connection closes
  req.on("close", () => {
    clients[channelId] = clients[channelId].filter(c => c !== res);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Read Receipts backend running on port ${PORT}`);
});
