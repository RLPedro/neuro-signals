import React from "react";
import { useNeuroData } from "../context/NeuroStreamContext";

export const HeaderControls: React.FC = () => {
  const {
    anomalies,
    is3D,
    setIs3D,
    startRecording,
    exportRecording,
    startReplay,
    clearRecording,
  } = useNeuroData();

  const latestAnomaly = anomalies[anomalies.length - 1];

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-4">
      {latestAnomaly && (
        <div className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap">
          Anomaly: {(latestAnomaly.score * 100).toFixed(0)}%
        </div>
      )}

      <button
        onClick={() => setIs3D(!is3D)}
        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
          is3D
            ? "bg-blue-600 text-white shadow-md"
            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
        }`}
      >
        {is3D ? "3D" : "2D"}
      </button>

      <button
        onClick={startRecording}
        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm md:text-base shadow-lg transition-all"
      >
        Start Rec
      </button>
      <button
        onClick={exportRecording}
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2.5 rounded-lg font-medium text-sm"
      >
        Export
      </button>
      <button
        onClick={() => startReplay(1)}
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2.5 rounded-lg font-medium text-sm"
      >
        Replay
      </button>
      <button
        onClick={clearRecording}
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2.5 rounded-lg font-medium text-sm"
      >
        Clear
      </button>
    </div>
  );
};