import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";
import { generateSamples, computeAnomalyScore } from "./neuroStream";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "NeuroSignals server running" });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const sessionId = url.searchParams.get("sessionId") ?? "default";
  console.log("Client connected for session:", sessionId);

  const interval = setInterval(() => {
    const channels = generateSamples();
    const msg = {
      type: "SAMPLES",
      ts: Date.now(),
      channels
    };
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }

    const { score, maxRms } = computeAnomalyScore(channels);
    if (score > 0.02) {
      const anomalyMsg = {
        type: "ANOMALY",
        ts: Date.now(),
        score,
        maxRms
      };
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(anomalyMsg));
    }
  }, 100);

  ws.on("close", () => {
    console.log("Client disconnected from session:", sessionId);
    clearInterval(interval);
  });

  ws.on("error", (err) => {
    console.error("WS error:", err);
    clearInterval(interval);
  });
});


const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`HTTP server on http://localhost:${PORT}`);
  console.log(`WS server on ws://localhost:${PORT}/ws`);
});
