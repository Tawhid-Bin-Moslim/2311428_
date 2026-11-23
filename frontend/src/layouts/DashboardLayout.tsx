import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";

export default function DashboardLayout() {
  return (
    <div className="app">
      <Sidebar />

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}