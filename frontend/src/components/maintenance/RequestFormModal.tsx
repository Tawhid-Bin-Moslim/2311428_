
import type { FormEvent } from "react";
import { X, ClipboardList, MapPin, FileText, AlertCircle } from "lucide-react";
import type { CreateMaintenanceRequest } from "../../services/maintenanceService";

interface RequestFormModalProps {
  showForm: boolean;
  submitting: boolean;
  formError: string;
  formData: CreateMaintenanceRequest;
  setFormData: (data: CreateMaintenanceRequest) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onReset: () => void;
}

export default function RequestFormModal({
  showForm,
  submitting,
  formError,
  formData,
  setFormData,
  onSubmit,
  onClose,
  onReset,
}: RequestFormModalProps) {
  if (!showForm) return null;

  const closeForm = () => {
    onClose();
    onReset();
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          closeForm();
        }
      }}
    >
      <div
        className="modal request-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-modal-title"
      >
        <div className="modal-header request-form-header">
          <div className="request-form-heading">
            <div className="request-form-icon">
              <ClipboardList size={21} />
            </div>

            <div>
              <h2 id="request-modal-title">New Maintenance Request</h2>
              <p>Provide the details so your maintenance issue can be addressed.</p>
            </div>
          </div>

          <button
            className="icon-button request-form-close"
            type="button"
            disabled={submitting}
            onClick={closeForm}
            aria-label="Close form"
          >
            <X size={19} />
          </button>
        </div>

        <form className="request-form" onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="request-title">
              Request Title <span className="required-mark">*</span>
            </label>
            <input
              id="request-title"
              type="text"
              placeholder="e.g. Water leakage in bathroom"
              value={formData.title}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  title: e.target.value,
                })
              }
              minLength={3}
              maxLength={150}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="request-description">
              Description <span className="required-mark">*</span>
            </label>
            <textarea
              id="request-description"
              placeholder="Describe the issue and mention any important details..."
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              minLength={5}
              required
            />
            <span className="field-hint">
              Include details that will help the maintenance team understand the issue.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="request-location">
              Location <span className="required-mark">*</span>
            </label>
            <div className="request-input-icon">
              <MapPin size={17} />
              <input
                id="request-location"
                type="text"
                placeholder="e.g. Flat 4B, Kitchen"
                value={formData.location}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: e.target.value,
                  })
                }
                minLength={2}
                maxLength={150}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="request-priority">Priority</label>
            <select
              id="request-priority"
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target.value as CreateMaintenanceRequest["priority"],
                })
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}

          <div className="modal-actions request-form-actions">
            <button
              type="button"
              className="cancel-button"
              disabled={submitting}
              onClick={closeForm}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Create Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
