
import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";

export default function DashboardLayout() {
  return (
    <div className="app">
      <Sidebar />

      <main className="main-content">
        <Navbar />

        <Outlet />
      </main>
    </div>
  );
}
