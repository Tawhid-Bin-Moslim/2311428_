
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/": "Maintenance",
  "/announcements": "Announcements",
  "/buildings": "Buildings",
  "/flats": "Flats",
  "/occupancies": "Occupancies",
  "/my-flat": "My Flat",
};

export default function Navbar() {
  const { pathname } = useLocation();

  const pageTitle = pageTitles[pathname] ?? "ApartmentCare";

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>ApartmentCare</span>
        <span aria-hidden="true">/</span>
        <strong>{pageTitle}</strong>
      </div>
    </header>
  );
}
