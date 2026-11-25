import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Megaphone,
  Plus,
  Search,
  Pencil,
  Archive,
  X,
  CalendarDays,
} from "lucide-react";

import Navbar from "../components/layout/Navbar";
import { useAuth } from "../context/AuthContext";

import { getBuildings } from "../services/buildingService";
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  archiveAnnouncement,
} from "../services/announcementService";

import type { Building } from "../types/building";
import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementStatus,
  CreateAnnouncement,
} from "../types/announcement";

const initialForm: CreateAnnouncement = {
  building_id: null,
  title: "",
  description: "",
  category: "general",
  status: "draft",
  expires_at: null,
};

function formatDate(value: string | null) {
  if (!value) return "No expiration";

  return new Date(value).toLocaleString();
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getStatusClass(status: AnnouncementStatus) {
  return `announcement-status status-${status}`;
}

export default function AnnouncementsPage() {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const canManage = user?.role === "admin" || user?.role === "building_manager";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);

  const [formData, setFormData] = useState<CreateAnnouncement>(initialForm);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const announcementData = await getAnnouncements();
        setAnnouncements(announcementData);

        if (isAdmin) {
          const buildingData = await getBuildings();

          setBuildings(
            buildingData.filter((building) => building.status === "active"),
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load announcements.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isAdmin]);

  const filteredAnnouncements = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return announcements;

    return announcements.filter((announcement) => {
      return (
        announcement.title.toLowerCase().includes(search) ||
        announcement.description.toLowerCase().includes(search) ||
        announcement.category.includes(search) ||
        announcement.status.includes(search) ||
        announcement.created_by_name.toLowerCase().includes(search)
      );
    });
  }, [announcements, searchTerm]);

  const totalAnnouncements = announcements.length;

  const publishedCount = announcements.filter(
    (item) => item.status === "published",
  ).length;

  const draftCount = announcements.filter(
    (item) => item.status === "draft",
  ).length;

  function openCreateForm() {
    setEditingAnnouncement(null);
    setFormData({ ...initialForm });
    setFormError("");
    setActionError("");
    setShowForm(true);
  }

  function openEditForm(announcement: Announcement) {
    setEditingAnnouncement(announcement);

    setFormData({
      building_id: announcement.building_id,
      title: announcement.title,
      description: announcement.description,
      category: announcement.category,
      status:
        announcement.status === "archived" ? "draft" : announcement.status,
      expires_at: announcement.expires_at,
    });

    setFormError("");
    setActionError("");
    setShowForm(true);
  }

  function closeForm() {
    if (submitting) return;

    setShowForm(false);
    setEditingAnnouncement(null);
    setFormData({ ...initialForm });
    setFormError("");
  }

  function updateFormField<K extends keyof CreateAnnouncement>(
    field: K,
    value: CreateAnnouncement[K],
  ) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) return;

    setSubmitting(true);
    setFormError("");

    try {
      const expiresAt = formData.expires_at;

      const normalizedExpiration = expiresAt
        ? new Date(expiresAt).toISOString()
        : null;

      if (editingAnnouncement) {
        const updateData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          status: formData.status,
          expires_at: normalizedExpiration,
        };

        const updated = await updateAnnouncement(
          editingAnnouncement.id,
          updateData,
        );

        setAnnouncements((previous) =>
          previous.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else {
        const createData: CreateAnnouncement = {
          ...formData,
          building_id: isAdmin ? formData.building_id : null,
          expires_at: normalizedExpiration,
        };

        const created = await createAnnouncement(createData);

        setAnnouncements((previous) => [created, ...previous]);
      }

      setShowForm(false);
      setEditingAnnouncement(null);
      setFormData({ ...initialForm });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(announcement: Announcement) {
    if (!canManage) return;

    const confirmed = window.confirm(`Archive "${announcement.title}"?`);

    if (!confirmed) return;

    setActionError("");

    try {
      await archiveAnnouncement(announcement.id);

      setAnnouncements((previous) =>
        previous.map((item) =>
          item.id === announcement.id ? { ...item, status: "archived" } : item,
        ),
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to archive announcement.",
      );
    }
  }

  function getBuildingName(buildingId: string | null) {
    if (!buildingId) return "All Buildings";

    return (
      buildings.find((building) => building.id === buildingId)?.name ??
      "Building-specific"
    );
  }

  return (
    <>
      <Navbar />

      <section className="content announcements-page">
        <div className="page-heading">
          <div>
            <h1>Announcements</h1>
            <p>
              {isAdmin
                ? "Create and manage announcements across ApartmentCare."
                : user?.role === "building_manager"
                  ? "Manage announcements for your assigned building."
                  : "View announcements for your building."}
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              className="primary-button"
              onClick={openCreateForm}
            >
              <Plus size={17} />
              New Announcement
            </button>
          )}
        </div>

        {canManage && (
          <div className="stats-grid announcement-stats">
            <div className="stat-card">
              <div className="stat-icon">
                <Megaphone size={20} />
              </div>
              <div>
                <p>Total Announcements</p>
                <h2>{totalAnnouncements}</h2>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <CalendarDays size={20} />
              </div>
              <div>
                <p>Published</p>
                <h2>{publishedCount}</h2>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Pencil size={20} />
              </div>
              <div>
                <p>Drafts</p>
                <h2>{draftCount}</h2>
              </div>
            </div>
          </div>
        )}

        <div className="table-card announcement-card">
          <div className="table-header">
            <div>
              <h3>Announcement List</h3>
              <p>{filteredAnnouncements.length} announcement(s)</p>
            </div>

            <div className="search-box">
              <Search size={17} />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          {actionError && <p className="announcement-error">{actionError}</p>}

          {loading ? (
            <div className="announcement-message">Loading announcements...</div>
          ) : error ? (
            <div className="announcement-error">{error}</div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="announcement-message">
              <Megaphone size={30} />
              <p>No announcements found.</p>
            </div>
          ) : (
            <div className="announcement-list">
              {filteredAnnouncements.map((announcement) => (
                <article className="announcement-item" key={announcement.id}>
                  <div className="announcement-item-top">
                    <div className="announcement-title-area">
                      <h3>{announcement.title}</h3>

                      <div className="announcement-meta">
                        <span className="announcement-category">
                          {announcement.category}
                        </span>

                        <span className={getStatusClass(announcement.status)}>
                          {announcement.status.replace("_", " ")}
                        </span>

                        {isAdmin && (
                          <span className="announcement-building">
                            {getBuildingName(announcement.building_id)}
                          </span>
                        )}
                      </div>
                    </div>

                    {canManage && announcement.status !== "archived" && (
                      <div className="announcement-actions">
                        <button
                          type="button"
                          title="Edit announcement"
                          onClick={() => openEditForm(announcement)}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          title="Archive announcement"
                          onClick={() => handleArchive(announcement)}
                        >
                          <Archive size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="announcement-description">
                    {announcement.description}
                  </p>

                  <div className="announcement-footer">
                    <span>By {announcement.created_by_name}</span>

                    <span>Created: {formatDate(announcement.created_at)}</span>

                    {announcement.expires_at && (
                      <span>
                        Expires: {formatDate(announcement.expires_at)}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {showForm && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <div
            className="modal announcement-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-form-title"
          >
            <div className="announcement-modal-heading">
              <div>
                <h2 id="announcement-form-title">
                  {editingAnnouncement
                    ? "Edit Announcement"
                    : "Create Announcement"}
                </h2>
                <p>Provide the announcement details below.</p>
              </div>

              <button
                type="button"
                className="announcement-close"
                onClick={closeForm}
                disabled={submitting}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {isAdmin && !editingAnnouncement && (
                <div className="form-group">
                  <label htmlFor="announcement-building">Target Building</label>

                  <select
                    id="announcement-building"
                    value={formData.building_id ?? ""}
                    onChange={(event) =>
                      updateFormField("building_id", event.target.value || null)
                    }
                  >
                    <option value="">All Buildings (Global)</option>

                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name} ({building.building_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="announcement-title">Title</label>
                <input
                  id="announcement-title"
                  type="text"
                  minLength={3}
                  maxLength={200}
                  required
                  value={formData.title}
                  onChange={(event) =>
                    updateFormField("title", event.target.value)
                  }
                  placeholder="Enter announcement title"
                />
              </div>

              <div className="form-group">
                <label htmlFor="announcement-description">Description</label>
                <textarea
                  id="announcement-description"
                  minLength={5}
                  required
                  value={formData.description}
                  onChange={(event) =>
                    updateFormField("description", event.target.value)
                  }
                  placeholder="Write announcement details..."
                  rows={5}
                />
              </div>

              <div className="announcement-form-row">
                <div className="form-group">
                  <label htmlFor="announcement-category">Category</label>

                  <select
                    id="announcement-category"
                    value={formData.category}
                    onChange={(event) =>
                      updateFormField(
                        "category",
                        event.target.value as AnnouncementCategory,
                      )
                    }
                  >
                    <option value="general">General</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="billing">Billing</option>
                    <option value="security">Security</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="announcement-status">Status</label>

                  <select
                    id="announcement-status"
                    value={formData.status}
                    onChange={(event) =>
                      updateFormField(
                        "status",
                        event.target.value as "draft" | "published",
                      )
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="announcement-expiration">
                  Expiration (Optional)
                </label>

                <input
                  id="announcement-expiration"
                  type="datetime-local"
                  value={toDateTimeLocal(formData.expires_at)}
                  onChange={(event) =>
                    updateFormField("expires_at", event.target.value || null)
                  }
                />

                <small className="announcement-help">
                  Leave empty if this announcement should not expire.
                </small>
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
                    : editingAnnouncement
                      ? "Save Changes"
                      : "Create Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
