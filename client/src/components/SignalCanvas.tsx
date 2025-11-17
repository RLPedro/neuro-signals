import { useEffect, useRef } from "react";
import { useNeuroData } from "../context/NeuroStreamContext";

export const SignalCanvas = () => {
  const { samples } = useNeuroData();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;

    const channelCount = samples.length || 1;
    const bandHeight = height / channelCount;

    samples.forEach((ch, idx) => {
      const values = ch.values;
      if (!values.length) return;

      const yBase = bandHeight * idx + bandHeight / 2;
      const stepX = width / values.length;

      ctx.beginPath();
      ctx.moveTo(0, yBase);

      values.forEach((v, i) => {
        const x = i * stepX;
        const y = yBase - v * (bandHeight * 0.4);
        ctx.lineTo(x, y);
      });

      ctx.stroke();
    });
  }, [samples]);

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="font-semibold mb-2 text-sm">2D Signal View</h2>
      <canvas
        ref={canvasRef}
        width={800}
        height={300}
        className="w-full border rounded-md bg-black/95"
      />
    </div>
  );
}
