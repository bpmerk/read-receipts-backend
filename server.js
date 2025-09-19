// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const receipts = {};
const clients = {}; // { channelId: [res, ...] }

app.post("/read", (req, res) => {
    const { userId, channelId, messageId, timestamp } = req.body;
    if (!userId || !channelId || !messageId || !timestamp) return res.status(400).json({ error: "Missing fields" });

    if (!receipts[channelId]) receipts[channelId] = {};
    if (!receipts[channelId][messageId]) receipts[channelId][messageId] = {};
    receipts[channelId][messageId][userId] = timestamp;

    // Notify SSE clients
    if (clients[channelId]) {
        const data = JSON.stringify({ [messageId]: receipts[channelId][messageId] });
        clients[channelId].forEach(res => res.write(`data: ${data}\n\n`));
    }

    res.json({ success: true });
});

app.get("/status/:channelId", (req, res) => {
    const channelId = req.params.channelId;
    res.json(receipts[channelId] || {});
});

// SSE endpoint
app.get("/updates/:channelId", (req, res) => {
    const channelId = req.params.channelId;
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    });
    res.flushHeaders();

    if (!clients[channelId]) clients[channelId] = [];
    clients[channelId].push(res);

    req.on("close", () => {
        clients[channelId] = clients[channelId].filter(r => r !== res);
    });
});

app.listen(PORT, () => console.log(`✅ Read Receipts backend running on port ${PORT}`));
