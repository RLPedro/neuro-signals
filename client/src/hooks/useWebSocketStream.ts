import { useEffect, useRef, useState } from "react";

export type ChannelSample = { label: string; values: number[] };
export type NeuroMessageSample = { type: "SAMPLES"; ts: number; channels: ChannelSample[] };
export type NeuroMessageAnomaly = { type: "ANOMALY"; ts: number; score: number; maxRms?: number };
export type NeuroMessage = NeuroMessageSample | NeuroMessageAnomaly;

type SessionEntry = {
  ws: WebSocket | null;
  evt: EventTarget;
  refCount: number;
  lastOpenTs?: number;
  heartbeatTimer?: number | null;
  pendingCreate?: number | null;
  pendingClose?: number | null;
};

const sessions: Map<string, SessionEntry> = new Map();

const buildWsUrl = (sessionId: string) => {
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://localhost:4000/ws?sessionId=${encodeURIComponent(sessionId)}`;
}

const createSocketForEntry = (sessionId: string, entry: SessionEntry) => {
  if (entry.ws || entry.refCount <= 0) return;
  const url = buildWsUrl(sessionId);
  console.info("[WS:manager] create socket ->", url);
  const ws = new WebSocket(url);
  entry.ws = ws;

  ws.onopen = () => {
    entry.lastOpenTs = Date.now();
    console.info("[WS:manager] open", url);
    if (entry.heartbeatTimer) clearInterval(entry.heartbeatTimer);
    entry.heartbeatTimer = window.setInterval(() => {
      try {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: "PING", ts: Date.now() }));
      } catch {}
    }, 15_000);
    entry.evt.dispatchEvent(new CustomEvent("ws:open"));
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data) as NeuroMessage | { type: string };
      entry.evt.dispatchEvent(new CustomEvent("ws:msg", { detail: msg }));
      console.debug(`[WS:manager] received msg type=${msg.type} ts=${msg || 'n/a'}`);
    } catch (err) {
      console.error("[WS:manager] parse error", err, ev.data);
    }
  };

  ws.onerror = (ev) => {
    console.error("[WS:manager] ws error event", ev);
  };

  ws.onclose = (ev) => {
    console.warn("[WS:manager] closed", { code: ev.code, reason: ev.reason, wasClean: ev.wasClean });
    entry.evt.dispatchEvent(new CustomEvent("ws:close", { detail: ev }));
    if (entry.heartbeatTimer) {
      clearInterval(entry.heartbeatTimer);
      entry.heartbeatTimer = null;
    }
    entry.ws = null;
    if (entry.refCount > 0) {
      const backoff = 1000;
      setTimeout(() => {
        if (entry.refCount > 0) createSocketForEntry(sessionId, entry);
      }, backoff);
    }
  };
}

const ensureSessionEntry = (sessionId: string) => {
  let entry = sessions.get(sessionId);
  if (entry) return entry;
  entry = {
    ws: null,
    evt: new EventTarget(),
    refCount: 0,
    heartbeatTimer: null,
    pendingCreate: null,
    pendingClose: null
  };
  sessions.set(sessionId, entry);
  return entry;
}

export const useWebSocketStream = (sessionId: string) => {
  const [samples, setSamples] = useState<ChannelSample[]>([]);
  const [anomalies, setAnomalies] = useState<NeuroMessageAnomaly[]>([]);
  const entryRef = useRef<SessionEntry | null>(null);

  useEffect(() => {
    const entry = ensureSessionEntry(sessionId);
    entryRef.current = entry;
    entry.refCount += 1;
    console.info(`[WS:hook] subscribed to session=${sessionId} (refs=${entry.refCount})`);

    if (entry.pendingClose) {
      clearTimeout(entry.pendingClose);
      entry.pendingClose = null;
      console.info("[WS:manager] cancelled pending close due to new subscriber");
    }

    if (entry.refCount === 1) {
      if (entry.pendingCreate) {
        clearTimeout(entry.pendingCreate);
        entry.pendingCreate = null;
      }
      entry.pendingCreate = window.setTimeout(() => {
        entry!.pendingCreate = null;
        if (entry!.refCount > 0 && !entry!.ws) createSocketForEntry(sessionId, entry!);
      }, 50);
    }

    const onMsg = (ev: Event) => {
      const custom = ev as CustomEvent;
      const msg = custom.detail as NeuroMessage;
      if (!msg || !msg.type) return;
      if (msg.type === "SAMPLES") {
        setSamples(msg.channels);
      } else if (msg.type === "ANOMALY") {
        setAnomalies((prev) => [...prev.slice(-50), msg as NeuroMessageAnomaly]);
        console.warn("[WS:hook] anomaly", (msg as NeuroMessageAnomaly).score, msg);
      }
    };
    const onOpen = () => {
      console.info("[WS:hook] session open", sessionId);
    };
    const onClose = (e: any) => {
      console.info("[WS:hook] session close", sessionId, e?.detail ?? e);
    };

    entry.evt.addEventListener("ws:msg", onMsg as EventListener);
    entry.evt.addEventListener("ws:open", onOpen as EventListener);
    entry.evt.addEventListener("ws:close", onClose as EventListener);

    return () => {
      entry.evt.removeEventListener("ws:msg", onMsg as EventListener);
      entry.evt.removeEventListener("ws:open", onOpen as EventListener);
      entry.evt.removeEventListener("ws:close", onClose as EventListener);

      entry.refCount -= 1;
      console.info(`[WS:hook] unsubscribed from session=${sessionId} (refs=${entry.refCount})`);

      if (entry.pendingCreate) {
        clearTimeout(entry.pendingCreate);
        entry.pendingCreate = null;
      }

      if (entry.refCount <= 0) {
        if (entry.pendingClose) clearTimeout(entry.pendingClose);
        entry.pendingClose = window.setTimeout(() => {
          if (entry.refCount <= 0) {
            try {
              if (entry.ws) {
                entry.ws.close();
                entry.ws = null;
              }
            } catch (e) {
              // ignore for now
            }
            if (entry.heartbeatTimer) {
              clearInterval(entry.heartbeatTimer);
              entry.heartbeatTimer = null;
            }
            sessions.delete(sessionId);
            console.info("[WS:manager] closed socket after grace period (no subscribers)");
          } else {
            console.info("[WS:manager] subscribers arrived during grace period; keeping socket");
          }
          entry.pendingClose = null;
        }, 500); // grace period
      }
    };
  }, [sessionId]);

  return { samples, anomalies };
}
