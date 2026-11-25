import { Routes, Route, Navigate } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import AuthLayout from "../layouts/AuthLayout";

import LoginPage from "../pages/auth/LoginPage";
import MaintenancePage from "../pages/MaintenancePage";
import AnnouncementsPage from "../pages/AnnouncementsPage";
import BuildingsPage from "../pages/BuildingsPage";
import FlatsPage from "../pages/FlatsPage";
import OccupanciesPage from "../pages/OccupanciesPage";
import MyFlatPage from "../pages/MyFlatPage";

import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<MaintenancePage />} />

          <Route
            path="/announcements"
            element={<AnnouncementsPage />}
          />

          <Route
            element={
              <ProtectedRoute
                allowedRoles={["admin", "building_manager"]}
              />
            }
          >
            <Route path="/buildings" element={<BuildingsPage />} />
            <Route path="/flats" element={<FlatsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route
              path="/occupancies"
              element={<OccupanciesPage />}
            />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["resident"]} />}>
            <Route path="/my-flat" element={<MyFlatPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
