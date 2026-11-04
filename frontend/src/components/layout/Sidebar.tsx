
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Settings,
  User,
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Building2 size={24} />
        </div>
        <span>ApartmentCare</span>
      </div>

      <p className="nav-label">MENU</p>

      <nav className="navigation">
        <a className="nav-item" href="#">
          <LayoutDashboard size={19} />
          Dashboard
        </a>

        <a className="nav-item active" href="#">
          <ClipboardList size={19} />
          Maintenance
        </a>

        <a className="nav-item" href="#">
          <Building2 size={19} />
          Residents
        </a>
      </nav>

      <div className="sidebar-bottom">
        <a className="nav-item" href="#">
          <Settings size={19} />
          Settings
        </a>

        <div className="profile">
          <div className="profile-avatar">
            <User size={20} />
          </div>

          <div>
            <strong>Building Manager</strong>
            <small>Administrator</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
