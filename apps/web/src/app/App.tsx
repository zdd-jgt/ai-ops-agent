import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardPage } from "../features/observability/DashboardPage.js";
import { ChatPage } from "../features/ops-chat/ChatPage.js";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
