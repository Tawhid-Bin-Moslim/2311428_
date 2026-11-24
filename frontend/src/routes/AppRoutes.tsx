import { Routes, Route, Navigate } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import AuthLayout from "../layouts/AuthLayout";

import LoginPage from "../pages/auth/LoginPage";
import MaintenancePage from "../pages/MaintenancePage";
import BuildingsPage from "../pages/BuildingsPage";
import FlatsPage from "../pages/FlatsPage";

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

          {/* Admin and Building Manager only */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["admin", "building_manager"]}
              />
            }
          >
            <Route
              path="/buildings"
              element={<BuildingsPage />}
            />

            <Route
              path="/flats"
              element={<FlatsPage />}
            />
          </Route>
        </Route>
      </Route>

      {/* Unknown routes */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
}
