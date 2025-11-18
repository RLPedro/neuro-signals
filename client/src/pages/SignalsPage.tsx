import React, { useLayoutEffect, useRef, useState } from "react";
import { SignalCanvas } from "../components/charts/LiveSignalCanvas";
import { BrainScene } from "../components/three/BrainScene";
import { SessionControlsInfo } from "../components/SessionControlsInfo";
import { useNeuroData } from "../context/NeuroStreamContext";

const SignalsPage: React.FC = () => {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const headerRef = useRef<HTMLElement | null>(null);

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

  useLayoutEffect(() => {
    function setVar() {
      const el = headerRef.current;
      if (!el) {
        document.documentElement.style.setProperty("--header-height", `88px`);
        return;
      }
      const h = el.getBoundingClientRect().height || 0;
      document.documentElement.style.setProperty("--header-height", `${Math.ceil(h)}px`);
    }
    setVar();
    const ro = new ResizeObserver(() => setVar());
    if (headerRef.current) ro.observe(headerRef.current);
    window.addEventListener("orientationchange", setVar);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", setVar);
    };
  }, []);

  return (
    <>
      <header
        ref={headerRef}
        className="relative sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">NeuroSignals</h1>
              <p className="text-sm text-slate-600 block max-w-[26rem] md:max-w-none">
                Live simulated brainwave visualizer — 2D oscilloscope & 3D view
              </p>
            </div>

            <div className="w-full lg:w-auto">
              <div className="mt-2 lg:mt-0 flex flex-wrap items-center gap-2 lg:gap-3 justify-start lg:justify-end">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="inline-flex rounded-full bg-gray-100 p-1">
                    <button
                      onClick={() => setMode("2d")}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${mode === "2d" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                    >
                      2D
                    </button>
                    <button
                      onClick={() => setMode("3d")}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${mode === "3d" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                    >
                      3D
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isRecording ? (
                    <button onClick={stopRecording} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm shadow hover:bg-red-700 whitespace-nowrap">
                      Stop Rec
                    </button>
                  ) : (
                    <button onClick={startRecording} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm shadow hover:bg-emerald-700 whitespace-nowrap">
                      Start Rec
                    </button>
                  )}

                  <button onClick={exportRecording} className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium text-sm hover:bg-gray-300 whitespace-nowrap">
                    Export
                  </button>

                  <button onClick={() => (isReplaying ? stopReplay() : startReplay(1))} className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium text-sm hover:bg-gray-300 whitespace-nowrap">
                    {isReplaying ? "Stop" : "Replay"}
                  </button>

                  <button onClick={clearRecording} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 whitespace-nowrap">
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {last && (
            <div className="lg:hidden absolute left-4 top-full mt-2">
              <div className="inline-block bg-red-50 text-red-700 px-3 py-1 rounded-full font-medium text-sm shadow-sm">
                Anomaly: {(last.score * 100).toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      </header>

      <main style={{ paddingTop: "var(--header-height, 88px)" }}>
        <div className="max-w-7xl mx-auto px-4 pb-8">
          {mode === "2d" ? <SignalCanvas /> : <div className="min-h-[18rem]"><BrainScene /></div>}

          <div className="mt-6 block md:hidden px-2">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-600 font-medium">Export • Replay • Clear — session data is local to this tab.</p>
            </div>
          </div>
        </div>
      </main>

      <SessionControlsInfo />
    </>
  );
};

export default SignalsPage;
