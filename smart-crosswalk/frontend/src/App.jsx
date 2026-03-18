import { Routes, Route } from "react-router-dom";
import { ToastProvider } from "./components/ui";
import { MainLayout } from "./layouts/MainLayout";
import { Dashboard, Alerts, Crosswalks, CrosswalkDetailsPage } from "./pages";
import { SocketBridge } from "./realtime/SocketBridge";

/**
 * App — root component.
 * Wraps the entire application with:
 * - `ToastProvider` (portal-based notification layer)
 * - `MainLayout` (Navbar + centered container)
 * - `<Routes>` (four page routes)
 */

function App() {
  return (
    <ToastProvider>
      <SocketBridge />
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/crosswalks" element={<Crosswalks />} />
          <Route path="/crosswalks/:id" element={<CrosswalkDetailsPage />} />
        </Routes>
      </MainLayout>
    </ToastProvider>
  );
}

export default App;
