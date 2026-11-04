
import "./index.css";

import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <div className="app">
      <Sidebar />

      <main className="main-content">
        <Dashboard />
      </main>
    </div>
  );
}