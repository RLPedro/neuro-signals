import React from "react";

export const SessionControlsInfo: React.FC = () => {
  return (
    <>
      <div className="hidden lg:fixed lg:block right-6 top-32 z-40 max-w-xs">
        <div
          className="bg-white/95 backdrop-blur rounded-xl shadow-xl border border-gray-200 p-5 text-xs text-gray-600 space-y-3"
          aria-hidden={false}
        >
          <h3 className="font-bold text-gray-800 text-sm">Session controls</h3>
          <div>• <strong>Export</strong> → download full session (.json)</div>
          <div>• <strong>Replay</strong> → play back any saved session</div>
          <div>• <strong>Clear</strong> → delete current session</div>
          <div className="pt-3 border-t border-gray-200 text-xs italic text-gray-500">
            All data lives only in this browser tab
          </div>
        </div>
      </div>

      <div className="lg:hidden text-center py-6 text-xs text-gray-500" aria-hidden={false}>
        Export • Replay • Clear — all data stays in this tab only
      </div>
    </>
  );
};
