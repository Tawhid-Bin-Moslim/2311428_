import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Users,
  Plus,
  Search,
  KeyRound,
  UserX,
  X,
  Clock3,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import type {
  ResidentRecord,
  CreateResidentRequest,
} from "../types/resident";
import type { Flat } from "../types/flat";
import { getResidents, createResident, resetAccountPassword, deactivateResident } from "../services/residentService";
import { getFlats } from "../services/flatService";
import { getBuildings } from "../services/buildingService";

const emptyForm: CreateResidentRequest = {
  full_name: "",
  email: "",
  flat_id: "",
  password: "",
  occupancy_type: "tenant",
};

export default function ResidentsPage() {
  const { user } = useAuth();

  const [residents, setResidents] = useState<ResidentRecord[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateResidentRequest>({ ...emptyForm });

  const [resetTarget, setResetTarget] =
    useState<ResidentRecord | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "building_manager";

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [residentData, flatData, buildingData] =
        await Promise.all([
          getResidents(),
          getFlats(),
          getBuildings(),
        ]);

      const activeBuildingIds = new Set(
        buildingData
          .filter((building) => building.status === "active")
          .map((building) => building.id)
      );

      setResidents(residentData);
      setFlats(
        flatData.filter((flat) =>
          activeBuildingIds.has(flat.building_id)
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Resident information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredResidents = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return residents;

    return residents.filter((resident) =>
      [
        resident.full_name,
        resident.email,
        resident.flat_number,
        resident.building_name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [residents, search]);

  function closeCreateForm() {
    if (submitting) return;

    setShowCreateForm(false);
    setCreateForm({ ...emptyForm });
    setError("");
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!createForm.flat_id) {
      setError("Please select a Flat.");
      return;
    }

    if (createForm.password.length < 4) {
      setError("Password must contain at least 4 characters.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const created = await createResident({
        ...createForm,
        full_name: createForm.full_name.trim(),
        email: createForm.email.trim().toLowerCase(),
      });

      setShowCreateForm(false);
      setCreateForm({ ...emptyForm });

      await loadData();

      setSuccess(
        `${created.full_name} was successfully added as a Resident.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create Resident account."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!resetTarget) return;

    if (newPassword.length < 4) {
      setError("Password must contain at least 4 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await resetAccountPassword(resetTarget.id, newPassword);

      setSuccess(
        `Password successfully reset for ${resetTarget.full_name}.`
      );
      setResetTarget(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to reset Resident password."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(resident: ResidentRecord) {
    const confirmed = window.confirm(
      `Deactivate ${resident.full_name}'s Resident account? Historical occupancy, payment, and audit records will be preserved.`
    );

    if (!confirmed) return;

    try {
      setActionId(resident.id);
      setError("");
      setSuccess("");

      await deactivateResident(resident.id);
      await loadData();

      setSuccess(
        `${resident.full_name}'s account was deactivated successfully.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to deactivate Resident account."
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <h1>Residents</h1>
          <p>
            {isManager
              ? "Manage Residents in your assigned building."
              : "View and manage Residents across all buildings."}
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setCreateForm({ ...emptyForm });
            setError("");
            setSuccess("");
            setShowCreateForm(true);
          }}
          disabled={flats.length === 0}
        >
          <Plus size={17} />
          Add Resident
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Users size={20} />
          </div>
          <div>
            <p>Active Residents</p>
            <h2>{residents.length}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <RefreshCw size={20} />
          </div>
          <div>
            <p>Available Flats</p>
            <h2>{flats.length}</h2>
          </div>
        </div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      {success && (
        <p className="role-success-message" role="status">
          {success}
        </p>
      )}

      <div className="table-card">
        <div className="table-header">
          <div>
            <h2>Resident Accounts</h2>
            <p>{filteredResidents.length} Resident(s) found</p>
          </div>

          <div className="resident-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search name, email, flat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="building-message">
            <Clock3 size={20} />
            Loading Residents...
          </div>
        ) : filteredResidents.length === 0 ? (
          <div className="building-message">
            <Users size={28} />
            <strong>No Residents found</strong>
            <span>
              {search
                ? "Try another search."
                : "New Residents will appear here after registration."}
            </span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>RESIDENT</th>
                  {isAdmin && <th>BUILDING</th>}
                  <th>FLAT</th>
                  <th>TYPE</th>
                  <th>MOVE IN</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredResidents.map((resident) => (
                  <tr key={resident.id}>
                    <td>
                      <div className="occupancy-resident-cell">
                        <strong>{resident.full_name}</strong>
                        <small>{resident.email}</small>
                      </div>
                    </td>

                    {isAdmin && (
                      <td>{resident.building_name}</td>
                    )}

                    <td>
                      <div className="occupancy-flat-cell">
                        <strong>{resident.flat_number}</strong>
                        <small>Floor {resident.floor_number}</small>
                      </div>
                    </td>

                    <td>
                      {resident.occupancy_type === "owner"
                        ? "Owner"
                        : "Tenant"}
                    </td>

                    <td>{resident.move_in_date}</td>

                    <td>
                      <div className="resident-actions">
                        <button
                          type="button"
                          className="icon-button"
                          title="Reset password"
                          aria-label={`Reset password for ${resident.full_name}`}
                          onClick={() => {
                            setResetTarget(resident);
                            setNewPassword("");
                            setConfirmPassword("");
                            setError("");
                          }}
                        >
                          <KeyRound size={17} />
                        </button>

                        {isManager && (
                          <button
                            type="button"
                            className="icon-button delete-action"
                            title="Deactivate Resident"
                            aria-label={`Deactivate ${resident.full_name}`}
                            disabled={actionId === resident.id}
                            onClick={() => handleDeactivate(resident)}
                          >
                            <UserX size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateForm && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCreateForm();
          }}
        >
          <div
            className="modal occupancy-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resident-create-title"
          >
            <div className="modal-header occupancy-modal-header">
              <div className="occupancy-modal-heading">
                <span className="occupancy-modal-icon">
                  <Users size={20} />
                </span>
                <div>
                  <h2 id="resident-create-title">Add Resident</h2>
                  <p>Create an account and assign a Flat.</p>
                </div>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={closeCreateForm}
                disabled={submitting}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form className="occupancy-form" onSubmit={handleCreate}>
              <div className="form-group">
                <label htmlFor="resident-name">Full Name</label>
                <input
                  id="resident-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={150}
                  autoComplete="name"
                  value={createForm.full_name}
                  onChange={(e) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      full_name: e.target.value,
                    }))
                  }
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="resident-email">Email</label>
                <input
                  id="resident-email"
                  type="email"
                  required
                  maxLength={255}
                  autoComplete="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      email: e.target.value,
                    }))
                  }
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="resident-flat">Assigned Flat</label>
                <select
                  id="resident-flat"
                  required
                  value={createForm.flat_id}
                  onChange={(e) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      flat_id: e.target.value,
                    }))
                  }
                  disabled={submitting || flats.length === 0}
                >
                  <option value="">Select Flat</option>
                  {flats.map((flat) => (
                    <option key={flat.id} value={flat.id}>
                      Flat {flat.flat_number} - Floor {flat.floor_number}
                    </option>
                  ))}
                </select>
                {isManager && (
                  <small>
                    Only Flats in your assigned building are available.
                  </small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="resident-occupancy-type">
                  Occupancy Type
                </label>
                <select
                  id="resident-occupancy-type"
                  value={createForm.occupancy_type}
                  onChange={(e) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      occupancy_type: e.target.value as "owner" | "tenant",
                    }))
                  }
                  disabled={submitting}
                >
                  <option value="tenant">Tenant</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="resident-password">Initial Password</label>
                <input
                  id="resident-password"
                  type="password"
                  required
                  minLength={4}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="At least 4 characters"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      password: e.target.value,
                    }))
                  }
                  disabled={submitting}
                />
              </div>

              {error && <p className="form-error">{error}</p>}

              <div className="modal-actions occupancy-form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeCreateForm}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    submitting ||
                    flats.length === 0 ||
                    createForm.full_name.trim().length < 2 ||
                    !createForm.email.trim() ||
                    !createForm.flat_id ||
                    createForm.password.length < 4
                  }
                >
                  {submitting ? "Creating..." : "Create Resident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetTarget && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setResetTarget(null);
              setNewPassword("");
              setConfirmPassword("");
            }
          }}
        >
          <div
            className="modal occupancy-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resident-reset-title"
          >
            <div className="modal-header occupancy-modal-header">
              <div className="occupancy-modal-heading">
                <span className="occupancy-modal-icon">
                  <KeyRound size={20} />
                </span>
                <div>
                  <h2 id="resident-reset-title">Reset Password</h2>
                  <p>{resetTarget.full_name}</p>
                </div>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => setResetTarget(null)}
                disabled={submitting}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form
              className="occupancy-form"
              onSubmit={handleResetPassword}
            >
              <div className="form-group">
                <label htmlFor="resident-new-password">
                  New Password
                </label>
                <input
                  id="resident-new-password"
                  type="password"
                  required
                  minLength={4}
                  maxLength={128}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="resident-confirm-password">
                  Confirm New Password
                </label>
                <input
                  id="resident-confirm-password"
                  type="password"
                  required
                  minLength={4}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {error && <p className="form-error">{error}</p>}

              <div className="modal-actions occupancy-form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setResetTarget(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    submitting ||
                    newPassword.length < 4 ||
                    newPassword !== confirmPassword
                  }
                >
                  {submitting ? "Saving..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}