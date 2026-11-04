
import { createPortal } from "react-dom";
import type { RefObject } from "react";
import type { MaintenanceRequest } from "../../types/maintenance";

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

export default function RequestActionMenu({
  openMenuId,
  menuPosition,
  actionMenuRef,
  requests,
  onViewDetails,
  onStatusChange,
  onDelete,
}: RequestActionMenuProps) {
  if (openMenuId === null || !menuPosition) {
    return null;
  }

  const request = requests.find(
    (item) => item.id === openMenuId
  );

  if (!request) return null;

  return createPortal(
    <div
      className="action-menu"
      ref={actionMenuRef}
      style={{
        position: "fixed",
        top: menuPosition.top,
        left: menuPosition.left,
      }}
    >
      <button
        type="button"
        onClick={() => onViewDetails(openMenuId)}
      >
        View Details
      </button>

      <div className="action-menu-divider" />

      <p>Change Status</p>

      {(
        ["pending", "in_progress", "completed"] as RequestStatus[]
      ).map((status) => (
        <button
          key={status}
          type="button"
          disabled={request.status === status}
          onClick={() =>
            onStatusChange(request.id, status)
          }
        >
          {status === "in_progress"
            ? "In Progress"
            : status.charAt(0).toUpperCase() + status.slice(1)}
          {request.status === status && " ✓"}
        </button>
      ))}

      <div className="action-menu-divider" />

      <button
        type="button"
        className="delete-action"
        onClick={() => onDelete(openMenuId)}
      >
        Delete Request
      </button>
    </div>,
    document.body
  );
}
