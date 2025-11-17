import React from "react";
import { NeuroStreamProvider } from "./context/NeuroStreamContext";
import MainLayout from "./layouts/MainLayout";
import SignalsPage from "./pages/SignalsPage";
import { SessionControlsInfo } from "./components/SessionControlsInfo";

const App: React.FC = () => {
  return (
    <NeuroStreamProvider>
      <MainLayout>
        <SignalsPage />
        <SessionControlsInfo />
      </MainLayout>
    </NeuroStreamProvider>
  );
};

export default App;