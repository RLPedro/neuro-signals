import React, {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { useWebSocketStream, ChannelSample } from "../hooks/useWebSocketStream";

type AnomalyEntry = { type: "ANOMALY"; ts: number; score: number; maxRms?: number };
type SampleEntry = { type: "SAMPLES"; ts: number; channels: ChannelSample[] };

type NeuroStreamContextValue = {
  samples: ChannelSample[];
  anomalies: AnomalyEntry[];
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: boolean;
  exportRecording: () => void;
  clearRecording: () => void;
  startReplay: (speed?: number) => void;
  stopReplay: () => void;
  isReplaying: boolean;
  is3D: boolean;
  setIs3D: React.Dispatch<React.SetStateAction<boolean>>;
};

const NeuroStreamContext = createContext<NeuroStreamContextValue | null>(null);

export const NeuroStreamProvider = ({ children }: { children: ReactNode }) => {
  const { samples, anomalies: hookAnomalies } = useWebSocketStream("demo-session");

  const [anomalies, setAnomalies] = useState<AnomalyEntry[]>(hookAnomalies || []);

  useEffect(() => {
    if (hookAnomalies && hookAnomalies.length > 0) {
      setAnomalies(hookAnomalies);
    }
  }, [hookAnomalies]);

  useEffect(() => {
    const scenarios = [
      {
        name: "Left Temporal Sharp Wave",
        score: 0.92,
        channels: ["T3", "F7"],
        regionColor: 0xff3366,
        description: "Sharp wave @ T3-F7, possible epileptiform discharge"
      },
      {
        name: "Right Frontal Theta Burst",
        score: 0.88,
        channels: ["F4", "C4"],
        regionColor: 0xff6600,
        description: "4–7 Hz theta burst over right frontal region"
      },
      {
        name: "Occipital Alpha Dropout",
        score: 0.75,
        channels: ["O1", "O2"],
        regionColor: 0x33ccff,
        description: "Bilateral alpha attenuation – eyes opening / arousal"
      },
      {
        name: "Generalized Spike-and-Wave",
        score: 0.98,
        channels: ["F3", "F4", "C3", "C4", "P3", "P4"],
        regionColor: 0xff0000,
        description: "3 Hz spike-and-wave → absence seizure pattern"
      },
    ];

    let idx = 0;
    const interval = setInterval(() => {
      const scenario = scenarios[idx % scenarios.length];
      idx++;

      const anomaly: AnomalyEntry & { meta: any } = {
        type: "ANOMALY",
        ts: Date.now(),
        score: scenario.score + Math.random() * 0.08,
        maxRms: 0.7 + Math.random() * 0.2,
        meta: {
          name: scenario.name,
          channels: scenario.channels,
          regionColor: scenario.regionColor,
          description: scenario.description
        }
      };

      setAnomalies(prev => [...prev.slice(-20), anomaly]);
      console.log(`[CLINICAL EVENT] ${anomaly.meta.name} | Score: ${anomaly.score.toFixed(2)} | ${anomaly.meta.description}`);
    }, 6500 + Math.random() * 4000);

    return () => clearInterval(interval);
  }, []);

  const [isRecording, setIsRecording] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [is3D, setIs3D] = useState(true);

  const recordRef = useRef<(SampleEntry | AnomalyEntry)[]>([]);
  const lastSampleRef = useRef<SampleEntry | null>(null);
  const lastAnomalyRef = useRef<AnomalyEntry | null>(null);

  useEffect(() => {
    if (!samples || samples.length === 0) return;
    const entry: SampleEntry = { type: "SAMPLES", ts: Date.now(), channels: samples };
    lastSampleRef.current = entry;
    if (isRecording) recordRef.current.push(entry);
  }, [samples, isRecording]);

  useEffect(() => {
    if (!anomalies || anomalies.length === 0) return;
    const last = anomalies[anomalies.length - 1];
    lastAnomalyRef.current = last;
    if (isRecording) {
      recordRef.current.push({ ...last, ts: Date.now() });
    }
  }, [anomalies, isRecording]);

  const startRecording = useCallback(() => {
    recordRef.current = [];
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => setIsRecording(false), []);

  const clearRecording = useCallback(() => {
    recordRef.current = [];
  }, []);

  const exportRecording = useCallback(() => {
    const data = {
      meta: { exportedAt: new Date().toISOString(), sessionId: "demo-session" },
      events: recordRef.current,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neuro-session-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const playbackRef = useRef<{ timer?: number; idx: number; events: any[] } | null>(null);

  const startReplay = useCallback((speed = 1) => {
    if (!recordRef.current || recordRef.current.length === 0) return;
    setIsReplaying(true);
    playbackRef.current = { idx: 0, events: [...recordRef.current] };

    const step = () => {
      const p = playbackRef.current;
      if (!p || p.idx >= p.events.length) {
        setIsReplaying(false);
        playbackRef.current = null;
        return;
      }
      const ev = p.events[p.idx++];
      if (ev.type === "SAMPLES") {
        lastSampleRef.current = ev;
        window.dispatchEvent(new CustomEvent("neuro:replay:samples", { detail: ev }));
      } else if (ev.type === "ANOMALY") {
        lastAnomalyRef.current = ev;
        window.dispatchEvent(new CustomEvent("neuro:replay:anomaly", { detail: ev }));
      }
      playbackRef.current!.timer = window.setTimeout(step, Math.max(30, 100 / speed));
    };
    step();
  }, []);

  const stopReplay = useCallback(() => {
    setIsReplaying(false);
    if (playbackRef.current?.timer) clearTimeout(playbackRef.current.timer);
    playbackRef.current = null;
  }, []);

  const value = useMemo(
    () => ({
      samples,
      anomalies,
      startRecording,
      stopRecording,
      isRecording,
      is3D,
      setIs3D,
      exportRecording,
      clearRecording,
      startReplay,
      stopReplay,
      isReplaying,
    }),
    [
      samples,
      anomalies,
      startRecording,
      stopRecording,
      isRecording,
      is3D,
      setIs3D,
      exportRecording,
      clearRecording,
      startReplay,
      stopReplay,
      isReplaying,
    ]
  );

  return <NeuroStreamContext.Provider value={value}>{children}</NeuroStreamContext.Provider>;
}

export const useNeuroData = () => {
  const ctx = React.useContext(NeuroStreamContext);
  if (!ctx) throw new Error("useNeuroData must be used within NeuroStreamProvider");
  return ctx;
}