
import { useEffect, useState, type FormEvent } from "react";

import Navbar from "../components/layout/Navbar";

import type {
  Occupancy,
  CreateOccupancy,
  OccupancyType,
} from "../types/occupancy";
import type { Flat } from "../types/flat";
import type { ManagedUser } from "../services/userService";

import {
  getOccupancies,
  createOccupancy,
  updateOccupancy,
  endOccupancy,
} from "../services/occupancyService";
import { getAdminUsers } from "../services/userService";
import { getFlats } from "../services/flatService";
import { getBuildings } from "../services/buildingService";

function getToday(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const initialForm: CreateOccupancy = {
  resident_id: "",
  flat_id: "",
  occupancy_type: "tenant",
  move_in_date: getToday(),
};

export default function OccupanciesPage() {
  const [occupancies, setOccupancies] = useState<Occupancy[]>([]);
  const [residents, setResidents] = useState<ManagedUser[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [buildingNames, setBuildingNames] = useState<Record<string, string>>(
    {}
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateOccupancy>(initialForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingOccupancy, setEditingOccupancy] =
    useState<Occupancy | null>(null);
  const [editingType, setEditingType] = useState<OccupancyType>("tenant");

  const [actionId, setActionId] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [occupancyData, userData, flatData, buildingData] =
        await Promise.all([
          getOccupancies(),
          getAdminUsers(),
          getFlats(),
          getBuildings(),
        ]);

      setOccupancies(occupancyData);

      // Identify Residents who already have an active occupancy.
      const occupiedResidentIds = new Set(
        occupancyData
          .filter((item) => item.move_out_date === null)
          .map((item) => item.resident_id)
      );

      // Only active Residents without an active occupancy can be assigned.
      setResidents(
        userData.filter(
          (user) =>
            user.role === "resident" &&
            user.is_active &&
            !occupiedResidentIds.has(user.id)
        )
      );

      // Identify active buildings.
      const activeBuildingIds = new Set(
        buildingData
          .filter((building) => building.status === "active")
          .map((building) => building.id)
      );

      // Only show flats belonging to active buildings.
      setFlats(
        flatData.filter((flat) =>
          activeBuildingIds.has(flat.building_id)
        )
      );

      // Store building names for the Flat dropdown.
      setBuildingNames(
        Object.fromEntries(
          buildingData.map((building) => [
            building.id,
            building.name,
          ])
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load occupancy data"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreateForm() {
    setFormData(initialForm);
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    if (submitting) return;

    setShowForm(false);
    setFormData(initialForm);
    setFormError("");
  }

  function handleFormChange(
    field: keyof CreateOccupancy,
    value: string
  ) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (residents.length === 0 || flats.length === 0) {
      setFormError("No eligible Resident or active-building flat is available.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      await createOccupancy(formData);

      setShowForm(false);
      setFormData(initialForm);

      await loadData();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Failed to assign Resident"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openEditForm(occupancy: Occupancy) {
    setEditingOccupancy(occupancy);
    setEditingType(occupancy.occupancy_type);
    setFormError("");
  }

  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!editingOccupancy) return;

    setSubmitting(true);
    setFormError("");

    try {
      await updateOccupancy(editingOccupancy.id, {
        occupancy_type: editingType,
      });

      setEditingOccupancy(null);
      await loadData();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Failed to update occupancy"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnd(occupancy: Occupancy) {
    const confirmed = window.confirm(
      `End the occupancy of ${occupancy.resident_name} in Flat ${occupancy.flat_number}?`
    );

    if (!confirmed) return;

    try {
      setActionId(occupancy.id);
      setError("");

      await endOccupancy(occupancy.id);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to end occupancy"
      );
    } finally {
      setActionId(null);
    }
  }

  const activeCount = occupancies.filter(
    (item) => item.move_out_date === null
  ).length;

  const historyCount = occupancies.length - activeCount;

  return (
    <>
      <Navbar />

      <section className="content">
        <div className="page-heading">
          <div>
            <h1>Occupancy Management</h1>
            <p>
              Assign Residents to flats and manage occupancy records.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={openCreateForm}
            disabled={flats.length === 0}
          >
            Assign Resident
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">A</div>
            <div>
              <p>Total Records</p>
              <h2>{occupancies.length}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">OK</div>
            <div>
              <p>Open Occupancies</p>
              <h2>{activeCount}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">H</div>
            <div>
              <p>Historical Records</p>
              <h2>{historyCount}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">R</div>
            <div>
              <p>Available Residents</p>
              <h2>{residents.length}</h2>
            </div>
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div>
              <h2>Occupancy Records</h2>
              <p>{occupancies.length} record(s) found</p>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          {loading ? (
            <div className="building-message">
              Loading occupancy records...
            </div>
          ) : occupancies.length === 0 ? (
            <div className="building-message">
              No occupancy records found.
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>RESIDENT</th>
                    <th>BUILDING</th>
                    <th>FLAT</th>
                    <th>TYPE</th>
                    <th>MOVE IN</th>
                    <th>MOVE OUT</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {occupancies.map((occupancy) => {
                    const isActive = occupancy.move_out_date === null;

                    return (
                      <tr key={occupancy.id}>
                        <td>
                          <strong>{occupancy.resident_name}</strong>
                          <small>{occupancy.resident_email}</small>
                        </td>

                        <td>{occupancy.building_name}</td>

                        <td>
                          <strong>{occupancy.flat_number}</strong>
                          <small>Floor {occupancy.floor_number}</small>
                        </td>

                        <td>
                          {occupancy.occupancy_type === "owner"
                            ? "Owner"
                            : "Tenant"}
                        </td>

                        <td>{occupancy.move_in_date}</td>
                        <td>{occupancy.move_out_date ?? "-"}</td>

                        <td>
                          <span
                            className={`badge ${
                              isActive ? "completed" : "pending"
                            }`}
                          >
                            {isActive ? "Active" : "Ended"}
                          </span>
                        </td>

                        <td>
                          {isActive ? (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                type="button"
                                className="cancel-button"
                                onClick={() => openEditForm(occupancy)}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="cancel-button"
                                disabled={actionId === occupancy.id}
                                onClick={() => handleEnd(occupancy)}
                              >
                                {actionId === occupancy.id
                                  ? "Ending..."
                                  : "End"}
                              </button>
                            </div>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <div>
                  <h2>Assign Resident to Flat</h2>
                  <p>Enter the Resident's occupancy information.</p>
                </div>

                <button
                  type="button"
                  className="icon-button"
                  onClick={closeForm}
                  disabled={submitting}
                  aria-label="Close form"
                >
                  X
                </button>
              </div>

              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label htmlFor="resident-select">Resident</label>
                  <select
                    id="resident-select"
                    required
                    disabled={residents.length === 0}
                    value={formData.resident_id}
                    onChange={(e) =>
                      handleFormChange("resident_id", e.target.value)
                    }
                  >
                    <option value="">
                      {residents.length === 0
                        ? "No eligible Residents available"
                        : "Select Resident"}
                    </option>

                    {residents.map((resident) => (
                      <option key={resident.id} value={resident.id}>
                        {resident.full_name} - {resident.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="flat-select">Flat</label>
                  <select
                    id="flat-select"
                    required
                    value={formData.flat_id}
                    onChange={(e) =>
                      handleFormChange("flat_id", e.target.value)
                    }
                  >
                    <option value="">Select Flat</option>

                    {flats.map((flat) => (
                      <option key={flat.id} value={flat.id}>
                        {buildingNames[flat.building_id] ?? "Building"} - Flat{" "}
                        {flat.flat_number} - Floor {flat.floor_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="occupancy-type">Occupancy Type</label>
                  <select
                    id="occupancy-type"
                    value={formData.occupancy_type}
                    onChange={(e) =>
                      handleFormChange("occupancy_type", e.target.value)
                    }
                  >
                    <option value="tenant">Tenant</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="move-in-date">Move-in Date</label>
                  <input
                    id="move-in-date"
                    type="date"
                    required
                    max={getToday()}
                    value={formData.move_in_date}
                    onChange={(e) =>
                      handleFormChange("move_in_date", e.target.value)
                    }
                  />
                </div>

                {formError && <p className="form-error">{formError}</p>}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeForm}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={
                      submitting ||
                      residents.length === 0 ||
                      flats.length === 0
                    }
                  >
                    {submitting ? "Assigning..." : "Assign Resident"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingOccupancy && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <div>
                  <h2>Edit Occupancy Type</h2>
                  <p>
                    {editingOccupancy.resident_name} - Flat{" "}
                    {editingOccupancy.flat_number}
                  </p>
                </div>

                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setEditingOccupancy(null)}
                  disabled={submitting}
                  aria-label="Close form"
                >
                  X
                </button>
              </div>

              <form onSubmit={handleUpdate}>
                <div className="form-group">
                  <label htmlFor="edit-occupancy-type">
                    Occupancy Type
                  </label>

                  <select
                    id="edit-occupancy-type"
                    value={editingType}
                    onChange={(e) =>
                      setEditingType(e.target.value as OccupancyType)
                    }
                  >
                    <option value="owner">Owner</option>
                    <option value="tenant">Tenant</option>
                  </select>
                </div>

                {formError && <p className="form-error">{formError}</p>}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => setEditingOccupancy(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
