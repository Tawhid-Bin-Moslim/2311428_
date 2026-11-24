import { useEffect, useState, type FormEvent } from "react";

import Navbar from "../components/layout/Navbar";
import { useAuth } from "../context/AuthContext";

import type { Building } from "../types/building";
import type { Flat, CreateFlat, UpdateFlat } from "../types/flat";

import { getBuildings } from "../services/buildingService";
import {
  getFlats,
  createFlat,
  updateFlat,
} from "../services/flatService";

const initialForm: CreateFlat = {
  building_id: "",
  flat_number: "",
  floor_number: 0,
};

export default function FlatsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);

  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [selectedFlat, setSelectedFlat] = useState<Flat | null>(null);
  const [formData, setFormData] = useState<CreateFlat>(initialForm);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Load buildings visible to the current user.
  useEffect(() => {
    async function loadBuildings() {
      try {
        setError("");
        const data = await getBuildings();
        setBuildings(data);

        // Managers start with their first assigned building.
        if (!isAdmin && data.length > 0) {
          setSelectedBuildingId(data[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load buildings"
        );
        setLoading(false);
      }
    }

    loadBuildings();
  }, [isAdmin]);

  // Load flats whenever the building filter changes.
  useEffect(() => {
    async function loadFlats() {
      try {
        setLoading(true);
        setError("");

        const data = await getFlats(selectedBuildingId || undefined);
        setFlats(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load flats"
        );
      } finally {
        setLoading(false);
      }
    }

    loadFlats();
  }, [selectedBuildingId]);

  function getBuildingName(buildingId: string) {
    return buildings.find((b) => b.id === buildingId)?.name ?? "Unknown";
  }

  function openCreateForm() {
    setSelectedFlat(null);

    setFormData({
      ...initialForm,
      building_id: selectedBuildingId || buildings[0]?.id || "",
    });

    setFormError("");
    setShowForm(true);
  }

  function openEditForm(flat: Flat) {
    setSelectedFlat(flat);

    setFormData({
      building_id: flat.building_id,
      flat_number: flat.flat_number,
      floor_number: flat.floor_number,
    });

    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    if (submitting) return;

    setShowForm(false);
    setSelectedFlat(null);
    setFormData(initialForm);
    setFormError("");
  }

  function handleInputChange(
    field: keyof CreateFlat,
    value: string
  ) {
    setFormData((previous) => ({
      ...previous,
      [field]: field === "floor_number" ? Number(value) : value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user || !formData.building_id) {
      setFormError("Please select a building.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      if (selectedFlat) {
        const updateData: UpdateFlat = {
          flat_number: formData.flat_number,
          floor_number: formData.floor_number,
        };

        await updateFlat(selectedFlat.id, updateData);
      } else {
        await createFlat(formData);
      }

      setShowForm(false);
      setSelectedFlat(null);

      // Refresh the list after saving.
      const data = await getFlats(selectedBuildingId || undefined);
      setFlats(data);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selectedBuilding = buildings.find(
    (building) => building.id === formData.building_id
  );

  return (
    <>
      <Navbar />

      <section className="content">
        <div className="page-heading">
          <div>
            <h1>Flat Management</h1>
            <p>
              Manage apartment flats and their floor information.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={openCreateForm}
            disabled={buildings.length === 0}
          >
            Add Flat
          </button>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div>
              <h2>Flats</h2>
              <p>{flats.length} flat(s) found</p>
            </div>

            <div className="form-group">
              <label htmlFor="building-filter">Building</label>
              <select
                id="building-filter"
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
              >
                {isAdmin && <option value="">All Buildings</option>}

                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          {loading ? (
            <div className="building-message">Loading flats...</div>
          ) : flats.length === 0 ? (
            <div className="building-message">No flats found.</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>BUILDING</th>
                    <th>FLAT NUMBER</th>
                    <th>FLOOR</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {flats.map((flat) => (
                    <tr key={flat.id}>
                      <td>
                        <strong>{getBuildingName(flat.building_id)}</strong>
                      </td>

                      <td>{flat.flat_number}</td>
                      <td>{flat.floor_number}</td>

                      <td>
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() => openEditForm(flat)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
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
                  <h2>
                    {selectedFlat ? "Edit Flat" : "Create Flat"}
                  </h2>
                  <p>Enter the flat information below.</p>
                </div>

                <button
                  type="button"
                  className="icon-button"
                  onClick={closeForm}
                  disabled={submitting}
                  aria-label="Close form"
                >
                  âœ•
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {!selectedFlat && (
                  <div className="form-group">
                    <label>Building</label>
                    <select
                      required
                      value={formData.building_id}
                      onChange={(e) =>
                        handleInputChange("building_id", e.target.value)
                      }
                    >
                      <option value="">Select Building</option>

                      {buildings.map((building) => (
                        <option key={building.id} value={building.id}>
                          {building.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedFlat && (
                  <div className="form-group">
                    <label>Building</label>
                    <input
                      value={getBuildingName(selectedFlat.building_id)}
                      disabled
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Flat Number</label>
                  <input
                    required
                    minLength={1}
                    maxLength={20}
                    value={formData.flat_number}
                    onChange={(e) =>
                      handleInputChange("flat_number", e.target.value)
                    }
                    placeholder="e.g. 301"
                  />
                </div>

                <div className="form-group">
                  <label>Floor Number</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={
                      selectedBuilding
                        ? selectedBuilding.total_floors - 1
                        : undefined
                    }
                    value={formData.floor_number}
                    onChange={(e) =>
                      handleInputChange("floor_number", e.target.value)
                    }
                  />

                  {selectedBuilding && (
                    <small>
                      Allowed floor numbers: 0 to{" "}
                      {selectedBuilding.total_floors - 1}
                    </small>
                  )}
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
                    disabled={submitting}
                  >
                    {submitting
                      ? "Saving..."
                      : selectedFlat
                        ? "Save Changes"
                        : "Create Flat"}
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