# NeuroSignals

Real-time brain-like signal visualizer built with React, TypeScript, WebSockets, and Node.

## Tech

- Frontend: React + TypeScript + Vite + TailwindCSS
- Backend: Node + Express + ws (WebSocket server)
- Architecture: Server streams simulated EEG-like data over WebSockets, client subscribes and visualizes.

## Getting started

### Backend

```bash
cd server
npm install
npm run dev
