
import { X, ClipboardList, MapPin, CalendarDays, Hash } from "lucide-react";
import type { MaintenanceRequest } from "../../types/maintenance";

interface RequestDetailsModalProps {
  detailsLoading: boolean;
  detailsError: string;
  selectedRequest: MaintenanceRequest | null;
  onClose: () => void;
}

export default function RequestDetailsModal({
  detailsLoading,
  detailsError,
  selectedRequest,
  onClose,
}: RequestDetailsModalProps) {
  if (!detailsLoading && !detailsError && !selectedRequest) {
    return null;
  }

  const priority = selectedRequest?.priority;
  const status = selectedRequest?.status;

  const formatStatus = (value: string) =>
    value === "in_progress"
      ? "In Progress"
      : value.charAt(0).toUpperCase() + value.slice(1);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !detailsLoading) {
          onClose();
        }
      }}
    >
      <div
        className="modal request-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-modal-title"
      >
        <div className="modal-header details-modal-header">
          <div className="details-modal-heading">
            <div className="details-modal-icon">
              <ClipboardList size={21} />
            </div>

            <div>
              <h2 id="details-modal-title">Request Details</h2>
              <p>Maintenance request information</p>
            </div>
          </div>

          <button
            className="icon-button"
            type="button"
            disabled={detailsLoading}
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={19} />
          </button>
        </div>

        {detailsLoading ? (
          <div className="details-loading">
            <div className="details-spinner" />
            <p>Loading request details...</p>
          </div>
        ) : detailsError ? (
          <div className="details-error">
            <p className="form-error" role="alert">
              {detailsError}
            </p>
          </div>
        ) : selectedRequest ? (
          <div className="request-details">
            <div className="details-summary">
              <div>
                <span className="details-eyebrow">REQUEST TITLE</span>
                <h3>{selectedRequest.title}</h3>
              </div>

              <div className="details-request-id">
                <Hash size={13} />
                {selectedRequest.id}
              </div>
            </div>

            <div className="details-badges">
              <span className={`details-priority priority-${priority}`}>
                {formatStatus(priority ?? "")} Priority
              </span>

              <span className={`details-status status-${status}`}>
                {formatStatus(status ?? "")}
              </span>
            </div>

            <div className="details-section">
              <h4>Description</h4>
              <p className="details-description">
                {selectedRequest.description}
              </p>
            </div>

            <div className="details-info-grid">
              <div className="details-info-item">
                <span className="details-info-icon">
                  <MapPin size={17} />
                </span>
                <div>
                  <label>Location</label>
                  <p>{selectedRequest.location}</p>
                </div>
              </div>

              <div className="details-info-item">
                <span className="details-info-icon">
                  <CalendarDays size={17} />
                </span>
                <div>
                  <label>Created At</label>
                  <p>
                    {selectedRequest.created_at
                      ? new Date(
                          selectedRequest.created_at
                        ).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="modal-actions details-modal-actions">
          <button
            type="button"
            className="cancel-button"
            disabled={detailsLoading}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
