import {
  ClipboardList,
  Building2,
  Settings,
  User,
  House,
  Users,
  Megaphone,
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
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.label}
              to={item.path}
              end
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="profile">
          <div className="profile-avatar">
            <User size={20} />
          </div>

          <div>
            <strong>{user.full_name}</strong>
            <small>{roleLabels[user.role]}</small>
          </div>
        </div>

        <button
          type="button"
          className="nav-item"
          onClick={logout}
        >
          <Settings size={19} />
          Logout
        </button>
      </div>
    </aside>
  );
}
