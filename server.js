// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000; // Use Render's dynamic port

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// In-memory storage: { channelId: { messageId: { userId: timestamp } } }
const receipts = {};

// POST /read - user reports reading a message
app.post("/read", (req, res) => {
  const { userId, channelId, messageId, timestamp } = req.body;

  if (!userId || !channelId || !messageId || !timestamp) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!receipts[channelId]) receipts[channelId] = {};
  if (!receipts[channelId][messageId]) receipts[channelId][messageId] = {};

  receipts[channelId][messageId][userId] = timestamp;

  res.json({ success: true });
});

// GET /status/:channelId - get all read receipts for a channel
app.get("/status/:channelId", (req, res) => {
  const { channelId } = req.params;
  const channelReceipts = receipts[channelId] || {};
  res.json(channelReceipts);
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Read Receipts backend running on port ${PORT}`);
});
