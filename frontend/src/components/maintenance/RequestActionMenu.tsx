
import { createPortal } from "react-dom";
import type { RefObject } from "react";
import {
  Eye,
  Clock,
  Wrench,
  CheckCircle2,
  Trash2,
  Check,
} from "lucide-react";
import type { MaintenanceRequest } from "../../types/maintenance";
import { useAuth } from "../../context/AuthContext";

type RequestStatus = MaintenanceRequest["status"];

interface MenuPosition {
  top: number;
  left: number;
}

interface RequestActionMenuProps {
  openMenuId: number | null;
  menuPosition: MenuPosition | null;
  actionMenuRef: RefObject<HTMLDivElement | null>;
  requests: MaintenanceRequest[];
  onViewDetails: (requestId: number) => void;
  onStatusChange: (
    requestId: number,
    newStatus: RequestStatus
  ) => void;
  onDelete: (requestId: number) => void;
}

const statusOptions: {
  value: RequestStatus;
  label: string;
  icon: typeof Clock;
}[] = [
  { value: "pending", label: "Pending", icon: Clock },
  { value: "in_progress", label: "In Progress", icon: Wrench },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
];

export default function RequestActionMenu({
  openMenuId,
  menuPosition,
  actionMenuRef,
  requests,
  onViewDetails,
  onStatusChange,
  onDelete,
}: RequestActionMenuProps) {
  const { user } = useAuth();

  if (openMenuId === null || !menuPosition || !user) {
    return null;
  }

  const request = requests.find(
    (item) => item.id === openMenuId
  );

  if (!request) return null;

  const canUpdateStatus = user.role === "building_manager";
  const canDelete = user.role === "admin";

  return createPortal(
    <div
      className="action-menu polished-action-menu"
      ref={actionMenuRef}
      role="menu"
      aria-label="Maintenance request actions"
      style={{
        position: "fixed",
        top: menuPosition.top,
        left: menuPosition.left,
      }}
    >
      <button
        type="button"
        role="menuitem"
        className="action-menu-item"
        onClick={() => onViewDetails(openMenuId)}
      >
        <Eye size={16} />
        <span>View Details</span>
      </button>

      {canUpdateStatus && (
        <>
          <div className="action-menu-divider" />

          <p className="action-menu-heading">CHANGE STATUS</p>

          {statusOptions.map(({ value, label, icon: Icon }) => {
            const isCurrent = request.status === value;

            return (
              <button
                key={value}
                type="button"
                role="menuitem"
                className={`action-menu-item status-action ${
                  isCurrent ? "current-status-action" : ""
                }`}
                disabled={isCurrent}
                onClick={() => onStatusChange(request.id, value)}
              >
                <Icon size={16} />
                <span>{label}</span>
                {isCurrent && <Check size={15} className="action-check" />}
              </button>
            );
          })}
        </>
      )}

      {canDelete && (
        <>
          <div className="action-menu-divider" />

          <button
            type="button"
            role="menuitem"
            className="action-menu-item delete-action"
            onClick={() => onDelete(openMenuId)}
          >
            <Trash2 size={16} />
            <span>Delete Request</span>
          </button>
        </>
      )}
    </div>,
    document.body
  );
}
