
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
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="details-modal-title">Request Details</h2>
            <p>
              Complete maintenance request information.
            </p>
          </div>

          <button
            className="icon-button"
            type="button"
            disabled={detailsLoading}
            onClick={onClose}
            aria-label="Close details"
          >
            ×
          </button>
        </div>

        {detailsLoading ? (
          <p>Loading request details...</p>
        ) : detailsError ? (
          <p className="form-error" role="alert">
            {detailsError}
          </p>
        ) : selectedRequest ? (
          <div className="request-details">
            <div className="form-group">
              <label>Request ID</label>
              <p>#{selectedRequest.id}</p>
            </div>

            <div className="form-group">
              <label>Title</label>
              <p>{selectedRequest.title}</p>
            </div>

            <div className="form-group">
              <label>Description</label>
              <p>{selectedRequest.description}</p>
            </div>

            <div className="form-group">
              <label>Location</label>
              <p>{selectedRequest.location}</p>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <p>
                {selectedRequest.priority.charAt(0).toUpperCase() +
                  selectedRequest.priority.slice(1)}
              </p>
            </div>

            <div className="form-group">
              <label>Status</label>
              <p>
                {selectedRequest.status === "in_progress"
                  ? "In Progress"
                  : selectedRequest.status.charAt(0).toUpperCase() +
                    selectedRequest.status.slice(1)}
              </p>
            </div>

            <div className="form-group">
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
        ) : null}

        <div className="modal-actions">
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
