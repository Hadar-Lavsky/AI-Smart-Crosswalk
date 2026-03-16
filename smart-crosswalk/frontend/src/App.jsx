import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "./components/ui";
import { MainLayout } from "./layouts/MainLayout";
import { Dashboard, Alerts, Crosswalks, CrosswalkDetailsPage } from "./pages";

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
