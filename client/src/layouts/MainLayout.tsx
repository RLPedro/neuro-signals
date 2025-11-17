import React from "react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
        {children}
      </div>
    </main>
  );
}