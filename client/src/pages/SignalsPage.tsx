import React, { useState } from "react";
import { SignalCanvas } from "../components/charts/LiveSignalCanvas";
import { BrainScene } from "../components/three/BrainScene";
import { SessionControlsInfo } from "../components/SessionControlsInfo";
import { useNeuroData } from "../context/NeuroStreamContext";

const SignalsPage: React.FC = () => {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const { 
    anomalies, 
    isRecording, 
    isReplaying, 
    startRecording, 
    stopRecording, 
    exportRecording, 
    clearRecording, 
    startReplay, 
    stopReplay 
  } = useNeuroData();
  const last = anomalies.length ? anomalies[anomalies.length - 1] : null;

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="px-4 py-5 max-w-7xl mx-auto">
          
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">NeuroSignals</h1>
              <p className="text-sm text-slate-600">
                Live simulated brainwave visualizer — 2D oscilloscope & 3D view
              </p>
            </div>

            <div className="w-full lg:w-auto flex flex-wrap items-center gap-3 justify-start lg:justify-end">
              <div className="flex items-center gap-3 flex-shrink-0">
                {last && (
                  <div className="bg-red-50 text-red-700 px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap">
                    Anomaly: {(last.score * 100).toFixed(0)}%
                  </div>
                )}

                <div className="inline-flex rounded-full bg-gray-100 p-1">
                  <button
                    onClick={() => setMode("2d")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      mode === "2d" ? "bg-slate-900 text-white" : "text-slate-600"
                    }`}
                  >
                    2D
                  </button>
                  <button
                    onClick={() => setMode("3d")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      mode === "3d" ? "bg-slate-900 text-white" : "text-slate-600"
                    }`}
                  >
                    3D
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
                {isRecording ? (
                  <button onClick={stopRecording} className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm shadow hover:bg-red-700">
                    Stop Rec
                  </button>
                ) : (
                  <button onClick={startRecording} className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm shadow hover:bg-emerald-700">
                    Start Rec
                  </button>
                )}
                <button onClick={exportRecording} className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-medium text-sm hover:bg-gray-300">
                  Export
                </button>
                <button
                  onClick={() => isReplaying ? stopReplay() : startReplay(1)}
                  className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-medium text-sm hover:bg-gray-300"
                >
                  {isReplaying ? "Stop" : "Replay"}
                </button>
                <button onClick={clearRecording} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200">
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-20 md:pt-24">
        <div className="max-w-7xl mx-auto px-4">
          {mode === "2d" ? <SignalCanvas /> : <BrainScene />}
          <SessionControlsInfo />
        </div>
      </main>
    </>
  );
};

export default SignalsPage;
