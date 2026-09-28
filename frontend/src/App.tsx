import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import { useAuth } from "./context/AuthContext";

import AuditLogsPage from "./pages/AuditLogsPage";
import ConflictsPage from "./pages/ConflictsPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import RecordsPage from "./pages/RecordsPage";
import RegisterPage from "./pages/RegisterPage";
import SyncHistoryPage from "./pages/SyncHistoryPage";

import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";

function HomeRedirect() {
  const { isAuthenticated } = useAuth();

  return (
    <Navigate
      to={
        isAuthenticated
          ? "/dashboard"
          : "/login"
      }
      replace
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<HomeRedirect />}
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/register"
        element={<RegisterPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />

          <Route
            path="/records"
            element={<RecordsPage />}
          />

          <Route
            path="/sync-history"
            element={<SyncHistoryPage />}
          />

          <Route
            path="/conflicts"
            element={<ConflictsPage />}
          />

          <Route
            path="/profile"
            element={<ProfilePage />}
          />

          <Route element={<AdminRoute />}>
            <Route
              path="/audit-logs"
              element={<AuditLogsPage />}
            />
          </Route>
        </Route>
      </Route>

      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  );
}