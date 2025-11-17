import { useNeuroStream } from "../hooks/useNeuroStream";

export const NeuroChart = () => {
  const { samples } = useNeuroStream("demo-session");

  return (
    <div className="p-4 rounded-2xl border bg-white shadow-sm max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-2">NeuroSignals – Live Stream</h1>
      <p className="text-sm text-gray-600 mb-3">
        This is a placeholder view. Below you can see the latest chunks of
        channel data coming in over WebSockets.
      </p>
      <div className="text-xs bg-slate-900 text-slate-50 rounded-lg p-3 h-64 overflow-auto font-mono">
        {JSON.stringify(samples.slice(-4), null, 2)}
      </div>
    </div>
  );
}
