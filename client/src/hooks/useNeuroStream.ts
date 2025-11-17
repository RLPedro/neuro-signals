import { useEffect, useRef, useState } from "react";

export type ChannelSample = {
  label: string;
  values: number[];
};

export type NeuroMessage =
  | { type: "SAMPLES"; ts: number; channels: ChannelSample[] }
  | { type: "ANOMALY"; ts: number; score: number };

export const useNeuroStream = (sessionId: string) => {
  const [samples, setSamples] = useState<ChannelSample[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:4000/ws?sessionId=${sessionId}`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const msg: NeuroMessage = JSON.parse(event.data);
      if (msg.type === "SAMPLES") {
        setSamples(msg.channels);
      }
    };

    ws.onopen = () => console.log("Connected to neuro stream");
    ws.onclose = () => console.log("Disconnected from neuro stream");
    ws.onerror = (err) => console.error("WS error", err);

    return () => ws.close();
  }, [sessionId]);

  return { samples };
}
