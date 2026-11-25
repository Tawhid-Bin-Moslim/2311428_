
import { useState } from "react";

import {
  ClipboardList,
  Building2,
  User,
  House,
  Users,
  Megaphone,
  Menu,
  X,
  LogOut,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  building_manager: "Building Manager",
  resident: "Resident",
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!user) return null;

  const navigationItems = [
    {
      label: "Maintenance",
      path: "/",
      icon: ClipboardList,
      roles: ["admin", "building_manager", "resident"] as UserRole[],
    },
    {
      label: "Announcements",
      path: "/announcements",
      icon: Megaphone,
      roles: ["admin", "building_manager", "resident"] as UserRole[],
    },
    {
      label: "Buildings",
      path: "/buildings",
      icon: Building2,
      roles: ["admin", "building_manager"] as UserRole[],
    },
    {
      label: "Flats",
      path: "/flats",
      icon: House,
      roles: ["admin", "building_manager"] as UserRole[],
    },
    {
      label: "Occupancies",
      path: "/occupancies",
      icon: Users,
      roles: ["admin"] as UserRole[],
    },
    {
      label: "My Flat",
      path: "/my-flat",
      icon: House,
      roles: ["resident"] as UserRole[],
    },
  ].filter((item) => item.roles.includes(user.role));

  function closeMobileMenu() {
    setIsMobileOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="mobile-menu-toggle"
        onClick={() => setIsMobileOpen((previous) => !previous)}
        aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isMobileOpen}
        aria-controls="apartment-sidebar"
      >
        {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {isMobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={closeMobileMenu}
          aria-label="Close navigation menu"
        />
      )}

      <aside
        id="apartment-sidebar"
        className={`sidebar ${isMobileOpen ? "mobile-open" : ""}`}
      >
        <div className="brand">
          <div className="brand-icon">
            <Building2 size={24} />
          </div>
          <span>ApartmentCare</span>
        </div>

        <p className="nav-label">MENU</p>

        <nav className="navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.label}
                to={item.path}
                end
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="profile-avatar">
              <User size={20} />
            </div>

            <div className="profile-info">
              <strong>{user.full_name}</strong>
              <small>{roleLabels[user.role]}</small>
            </div>
          </div>

          <button
            type="button"
            className="nav-item logout-button"
            onClick={logout}
          >
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
