
import { Routes, Route, Navigate } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import AuthLayout from "../layouts/AuthLayout";

import LoginPage from "../pages/auth/LoginPage";
import MaintenancePage from "../pages/MaintenancePage";
import BuildingsPage from "../pages/BuildingsPage";

import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Authentication routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected dashboard routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<MaintenancePage />} />

          {/* Only Admin and Building Manager */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["admin", "building_manager"]}
              />
            }
          >
            <Route path="/buildings" element={<BuildingsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
