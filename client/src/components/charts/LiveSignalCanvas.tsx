import React, { useEffect, useRef } from "react";
import { useNeuroData } from "../../context/NeuroStreamContext";
import type { ChannelSample } from "../../hooks/useWebSocketStream";

const HISTORY_SECONDS = 6;
const SAMPLE_RATE = 160;
const MAX_SAMPLES = HISTORY_SECONDS * SAMPLE_RATE;

type ChannelHistory = { buf: Float32Array; idx: number; len: number; lastAppendTs: number };
type SessionStore = Record<string, ChannelHistory>;

const persistentHistories: Record<string, SessionStore> = {};

const ensureChannelHistory = (sessionId: string, label: string) => {
  if (!persistentHistories[sessionId]) persistentHistories[sessionId] = {};
  const map = persistentHistories[sessionId];
  if (!map[label]) {
    map[label] = { buf: new Float32Array(MAX_SAMPLES), idx: 0, len: 0, lastAppendTs: 0 };
  }
  return map[label];
}

const appendToHistory = (sessionId: string, ch: ChannelSample) => {
  const entry = ensureChannelHistory(sessionId, ch.label);
  for (let i = 0; i < ch.values.length; i++) {
    entry.buf[entry.idx] = ch.values[i];
    entry.idx = (entry.idx + 1) % MAX_SAMPLES;
    entry.len = Math.min(entry.len + 1, MAX_SAMPLES);
  }
  entry.lastAppendTs = Date.now();
}

const SESSION_ID = "demo-session";

export const SignalCanvas: React.FC = () => {
  const { samples } = useNeuroData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastAppendRef = useRef<number>(0);
  const lastSummaryTs = useRef<number>(Date.now());

  useEffect(() => {
    if (!samples?.length) return;
    samples.forEach(ch => appendToHistory(SESSION_ID, ch));
    const store = persistentHistories[SESSION_ID] || {};
    const times = Object.values(store).map(h => h.lastAppendTs);
    if (times.length) lastAppendRef.current = Math.max(...times);
  }, [samples]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resizeAndClear = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      resizeAndClear();

      const rectW = canvas.clientWidth;
      const rectH = canvas.clientHeight;
      const visible = !!canvas.offsetParent;

      const store = persistentHistories[SESSION_ID] || {};
      const labels = Object.keys(store);
      const channelCount = Math.max(1, labels.length);

      ctx.fillStyle = "#071023";
      ctx.fillRect(0, 0, rectW, rectH);

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "#34d399";
      ctx.globalCompositeOperation = "lighter";

      labels.forEach((label, idx) => {
        const entry = store[label];
        if (!entry || entry.len === 0) return;

        const { buf, idx: writeIdx, len } = entry;
        const start = (writeIdx - len + MAX_SAMPLES) % MAX_SAMPLES;
        const bandHeight = rectH / channelCount;
        const yBase = bandHeight * idx + bandHeight / 2;
        const stepX = rectW / Math.max(len - 1, 1);

        ctx.beginPath();
        for (let i = 0; i < len; i++) {
          const pos = (start + i) % MAX_SAMPLES;
          const v = buf[pos];
          const x = i * stepX;
          const y = yBase - v * (bandHeight * 0.45);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(6, 6, 260, 58);
      ctx.fillStyle = "#fff";
      ctx.font = "12px ui-sans-serif, system-ui";
      ctx.fillText(`channels: ${labels.length}`, 14, 24);
      ctx.fillText(`lastAppendΔ: ${lastAppendRef.current ? Date.now() - lastAppendRef.current + "ms" : "n/a"}`, 14, 42);
      ctx.fillText(`visible: ${visible} rect: ${rectW}x${rectH}`, 14, 60);
      ctx.restore();
      
      const now = Date.now();
      if (now - lastSummaryTs.current > 1000) {
        lastSummaryTs.current = now;
        console.info(`[SIGCANVAS] summary channels=${labels.length} lastAppendΔ=${lastAppendRef.current ? now - lastAppendRef.current : -1}ms visible=${visible} rect=${rectW}x${rectH}`);
      }

      raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(resizeAndClear);
    ro.observe(canvas);
    resizeAndClear();
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="font-semibold mb-2 text-sm">2D Signal View</h2>
      <div className="w-full h-72 border rounded-md overflow-hidden relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};