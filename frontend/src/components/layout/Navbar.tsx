import { Bell, User } from "lucide-react";

export default function Navbar() {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>ApartmentCare</span>
        <span>/</span>
        <strong>Maintenance</strong>
      </div>

      <div className="topbar-actions">
        <button className="icon-button" type="button">
          <Bell size={19} />
        </button>

        <div className="header-avatar">
          <User size={19} />
        </div>
      </div>
    </header>
  );
}