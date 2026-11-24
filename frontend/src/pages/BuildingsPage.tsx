
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "../context/AuthContext";
import Navbar from "../components/layout/Navbar";

import type {
  Building,
  CreateBuilding,
  UpdateBuilding,
} from "../types/building";

import {
  getBuildings,
  createBuilding,
  updateBuilding,
} from "../services/buildingService";

const initialForm: CreateBuilding = {
  building_code: "",
  name: "",
  address: "",
  total_floors: 1,
  total_flats: 1,
  contact_phone: "",
};

export default function BuildingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [selectedBuilding, setSelectedBuilding] =
    useState<Building | null>(null);

  const [formData, setFormData] =
    useState<CreateBuilding>(initialForm);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    async function loadBuildings() {
      try {
        setError("");
        const data = await getBuildings();
        setBuildings(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load buildings"
        );
      } finally {
        setLoading(false);
      }
    }

    loadBuildings();
  }, []);

  function openCreateForm() {
    setSelectedBuilding(null);
    setFormData({ ...initialForm });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(building: Building) {
    setSelectedBuilding(building);

    setFormData({
      building_code: building.building_code,
      name: building.name,
      address: building.address,
      total_floors: building.total_floors,
      total_flats: building.total_flats,
      contact_phone: building.contact_phone ?? "",
    });

    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    if (submitting) return;

    setShowForm(false);
    setSelectedBuilding(null);
    setFormData({ ...initialForm });
    setFormError("");
  }

  function handleInputChange(
    field: keyof CreateBuilding,
    value: string
  ) {
    setFormData((previous) => ({
      ...previous,
      [field]:
        field === "total_floors" || field === "total_flats"
          ? Number(value)
          : value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isAdmin) return;

    setSubmitting(true);
    setFormError("");

    try {
      if (selectedBuilding) {
        const updateData: UpdateBuilding = {
        name: formData.name,
        address: formData.address,
        total_floors: formData.total_floors,
        total_flats: formData.total_flats,
        contact_phone: formData.contact_phone || null,
        status: selectedBuilding.status,
    };
        const updated = await updateBuilding(
          selectedBuilding.id,
          updateData
        );

        setBuildings((previous) =>
          previous.map((building) =>
            building.id === updated.id ? updated : building
          )
        );
      } else {
        const created = await createBuilding(formData);

        setBuildings((previous) => [...previous, created]);
      }

      setShowForm(false);
      setSelectedBuilding(null);
      setFormData({ ...initialForm });
      setFormError("");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />

      <section className="content">
        <div className="page-heading">
          <div>
            <h1>Building Management</h1>
            <p>
              {isAdmin
                ? "Create, view, and manage apartment buildings."
                : "View your assigned apartment building."}
            </p>
          </div>

          {isAdmin && (
            <button
              className="primary-button"
              type="button"
              onClick={openCreateForm}
            >
              Add Building
            </button>
          )}
        </div>

        {error && (
          <p className="form-error">{error}</p>
        )}

        {loading ? (
          <div className="table-card building-message">
            Loading buildings...
          </div>
        ) : buildings.length === 0 ? (
          <div className="table-card building-message">
            No buildings found.
          </div>
        ) : (
          <div className="table-card">
            <div className="table-header">
              <div>
                <h2>Buildings</h2>
                <p>
                  {buildings.length} building
                  {buildings.length !== 1 ? "s" : ""} found
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>BUILDING</th>
                    <th>ADDRESS</th>
                    <th>FLOORS</th>
                    <th>FLATS</th>
                    <th>PHONE</th>
                    <th>STATUS</th>
                    {isAdmin && <th>ACTION</th>}
                  </tr>
                </thead>

                <tbody>
                  {buildings.map((building) => (
                    <tr key={building.id}>
                      <td>
                        <strong>{building.name}</strong>
                        <small>{building.building_code}</small>
                      </td>

                      <td>{building.address}</td>
                      <td>{building.total_floors}</td>
                      <td>{building.total_flats}</td>
                      <td>{building.contact_phone || "—"}</td>

                      <td>
                        <span
                          className={`badge ${
                            building.status === "active"
                              ? "completed"
                              : "pending"
                          }`}
                        >
                          {building.status}
                        </span>
                      </td>

                      {isAdmin && (
                        <td>
                          <button
                            type="button"
                            className="cancel-button"
                            onClick={() => openEditForm(building)}
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showForm && isAdmin && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <div>
                  <h2>
                    {selectedBuilding
                      ? "Edit Building"
                      : "Create Building"}
                  </h2>
                  <p>
                    Enter the building information below.
                  </p>
                </div>

                <button
                  type="button"
                  className="icon-button"
                  onClick={closeForm}
                  disabled={submitting}
                  aria-label="Close form"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {!selectedBuilding && (
                  <div className="form-group">
                    <label>Building Code</label>
                    <input
                      required
                      minLength={2}
                      maxLength={30}
                      value={formData.building_code}
                      onChange={(e) =>
                        handleInputChange(
                          "building_code",
                          e.target.value
                        )
                      }
                      placeholder="e.g. BUILDING-001"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Building Name</label>
                  <input
                    required
                    minLength={2}
                    maxLength={150}
                    value={formData.name}
                    onChange={(e) =>
                      handleInputChange("name", e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    required
                    minLength={5}
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Total Floors</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.total_floors}
                    onChange={(e) =>
                      handleInputChange(
                        "total_floors",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Total Flats</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.total_flats}
                    onChange={(e) =>
                      handleInputChange(
                        "total_flats",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    maxLength={30}
                    value={formData.contact_phone}
                    onChange={(e) =>
                      handleInputChange(
                        "contact_phone",
                        e.target.value
                      )
                    }
                    placeholder="Optional"
                  />
                </div>

                {selectedBuilding && (
                  <div className="form-group">
                    <label>Building Status</label>
                    <select
                      value={selectedBuilding.status}
                      onChange={(e) =>
                        setSelectedBuilding((previous) =>
                          previous
                            ? {
                                ...previous,
                                status: e.target.value as
                                  | "active"
                                  | "inactive",
                              }
                            : null
                        )
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}

                {formError && (
                  <p className="form-error">{formError}</p>
                )}

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
                    disabled={submitting}
                  >
                    {submitting
                      ? "Saving..."
                      : selectedBuilding
                        ? "Save Changes"
                        : "Create Building"}
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
