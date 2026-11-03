
import "./index.css"
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { createPortal } from "react-dom"

import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Settings,
  Bell,
  Search,
  Plus,
  Wrench,
  Clock,
  CheckCircle2,
  MoreVertical,
  MapPin,
  CalendarDays,
  User,
} from "lucide-react"

type RequestStatus = "pending" | "in_progress" | "completed"

interface MaintenanceRequest {
  id: number
  title: string
  description: string
  location: string
  priority: "low" | "medium" | "high"
  status: RequestStatus
  created_at: string
}

interface MenuPosition {
  top: number
  left: number
}

export default function App() {
  // Maintenance request state
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Search and action menu state
  const [searchTerm, setSearchTerm] = useState("")
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const [actionError, setActionError] = useState("")

  const actionMenuRef = useRef<HTMLDivElement>(null)
  const actionButtonRef = useRef<HTMLButtonElement>(null)

  // View request details state
  const [selectedRequest, setSelectedRequest] =
    useState<MaintenanceRequest | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState("")

  // New request form state
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    priority: "medium",
  })

  // Fetch all maintenance requests
  useEffect(() => {
    async function fetchRequests() {
      try {
        const response = await fetch("/api/maintenance-requests")

        if (!response.ok) {
          throw new Error("Failed to fetch maintenance requests")
        }

        const data: MaintenanceRequest[] = await response.json()
        setRequests(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong"
        )
      } finally {
        setLoading(false)
      }
    }

    fetchRequests()
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node

      if (
        actionMenuRef.current?.contains(target) ||
        actionButtonRef.current?.contains(target)
      ) {
        return
      }

      setOpenMenuId(null)
      setMenuPosition(null)
    }

    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Close menu when scrolling or resizing
  useEffect(() => {
    if (openMenuId === null) return

    function closeMenu() {
      setOpenMenuId(null)
      setMenuPosition(null)
    }

    window.addEventListener("scroll", closeMenu, true)
    window.addEventListener("resize", closeMenu)

    return () => {
      window.removeEventListener("scroll", closeMenu, true)
      window.removeEventListener("resize", closeMenu)
    }
  }, [openMenuId])

  // Search maintenance requests
  const filteredRequests = requests.filter((request) => {
    const search = searchTerm.trim().toLowerCase()

    if (!search) return true

    return (
      request.title.toLowerCase().includes(search) ||
      request.description.toLowerCase().includes(search) ||
      request.location.toLowerCase().includes(search) ||
      request.priority.toLowerCase().includes(search) ||
      request.status.replace("_", " ").toLowerCase().includes(search)
    )
  })

  // Dynamic statistics
  const totalRequests = requests.length

  const pendingRequests = requests.filter(
    (request) => request.status === "pending"
  ).length

  const inProgressRequests = requests.filter(
    (request) => request.status === "in_progress"
  ).length

  const completedRequests = requests.filter(
    (request) => request.status === "completed"
  ).length

  // Reset form
  function resetForm() {
    setFormData({
      title: "",
      description: "",
      location: "",
      priority: "medium",
    })
    setFormError("")
  }

  // Create maintenance request
  async function handleCreateRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFormError("")

    try {
      const response = await fetch("/api/maintenance-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()

        throw new Error(
          typeof errorData.detail === "string"
            ? errorData.detail
            : "Failed to create maintenance request"
        )
      }

      const newRequest: MaintenanceRequest = await response.json()

      setRequests((previousRequests) => [
        newRequest,
        ...previousRequests,
      ])

      resetForm()
      setShowForm(false)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Something went wrong"
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Open or close the action popover
  function toggleActionMenu(
    requestId: number,
    button: HTMLButtonElement
  ) {
    if (openMenuId === requestId) {
      setOpenMenuId(null)
      setMenuPosition(null)
      return
    }

    const rect = button.getBoundingClientRect()

    const menuWidth = 190
    const menuHeight = 260
    const spacing = 8

    const spaceBelow = window.innerHeight - rect.bottom
    const shouldOpenAbove =
      spaceBelow < menuHeight + spacing &&
      rect.top > menuHeight + spacing

    const top = shouldOpenAbove
      ? rect.top - menuHeight - spacing
      : rect.bottom + spacing

    const left = Math.max(
      8,
      Math.min(
        rect.right - menuWidth,
        window.innerWidth - menuWidth - 8
      )
    )

    actionButtonRef.current = button
    setMenuPosition({ top, left })
    setOpenMenuId(requestId)
  }

  // Fetch a single maintenance request
  async function handleViewDetails(requestId: number) {
    setOpenMenuId(null)
    setMenuPosition(null)

    setSelectedRequest(null)
    setDetailsError("")
    setDetailsLoading(true)

    try {
      const response = await fetch(
        `/api/maintenance-requests/${requestId}`
      )

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Maintenance request not found"
            : "Failed to fetch maintenance request details"
        )
      }

      const data: MaintenanceRequest = await response.json()
      setSelectedRequest(data)
    } catch (err) {
      setDetailsError(
        err instanceof Error ? err.message : "Something went wrong"
      )
    } finally {
      setDetailsLoading(false)
    }
  }

  // Update maintenance request status
  async function handleStatusChange(
    requestId: number,
    newStatus: RequestStatus
  ) {
    setActionError("")
    setOpenMenuId(null)
    setMenuPosition(null)

    try {
      const response = await fetch(
        `/api/maintenance-requests/${requestId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to update request status")
      }

      const updatedRequest: MaintenanceRequest = await response.json()

      setRequests((previousRequests) =>
        previousRequests.map((request) =>
          request.id === requestId ? updatedRequest : request
        )
      )

      if (selectedRequest?.id === requestId) {
        setSelectedRequest(updatedRequest)
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Something went wrong"
      )
    }
  }

  // Delete maintenance request
  async function handleDeleteRequest(requestId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this maintenance request?"
    )

    if (!confirmed) return

    setActionError("")
    setOpenMenuId(null)
    setMenuPosition(null)

    try {
      const response = await fetch(
        `/api/maintenance-requests/${requestId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error("Failed to delete maintenance request")
      }

      setRequests((previousRequests) =>
        previousRequests.filter((request) => request.id !== requestId)
      )

      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null)
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Something went wrong"
      )
    }
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Building2 size={24} />
          </div>
          <span>ApartmentCare</span>
        </div>

        <p className="nav-label">MENU</p>

        <nav className="navigation">
          <a className="nav-item" href="#">
            <LayoutDashboard size={19} />
            Dashboard
          </a>

          <a className="nav-item active" href="#">
            <ClipboardList size={19} />
            Maintenance
          </a>

          <a className="nav-item" href="#">
            <Building2 size={19} />
            Residents
          </a>
        </nav>

        <div className="sidebar-bottom">
          <a className="nav-item" href="#">
            <Settings size={19} />
            Settings
          </a>

          <div className="profile">
            <div className="profile-avatar">
              <User size={20} />
            </div>

            <div>
              <strong>Building Manager</strong>
              <small>Administrator</small>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>ApartmentCare</span>
            <span>/</span>
            <strong>Maintenance</strong>
          </div>

          <div className="topbar-actions">
            <button className="icon-button" type="button">
              <Bell size={19} />
            </button>

            <div className="header-avatar">
              <User size={19} />
            </div>
          </div>
        </header>

        <section className="content">
          {/* Page Heading */}
          <div className="page-heading">
            <div>
              <h1>Maintenance Requests</h1>
              <p>
                Manage and track building maintenance requests.
              </p>
            </div>

            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setFormError("")
                setShowForm(true)
              }}
            >
              <Plus size={18} />
              New Request
            </button>
          </div>

          {/* New Maintenance Request Modal */}
          {showForm && (
            <div
              className="modal-overlay"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !submitting) {
                  setShowForm(false)
                  resetForm()
                }
              }}
            >
              <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="request-modal-title"
              >
                <div className="modal-header">
                  <div>
                    <h2 id="request-modal-title">
                      New Maintenance Request
                    </h2>
                    <p>
                      Enter the details of the maintenance issue.
                    </p>
                  </div>

                  <button
                    className="icon-button"
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                    aria-label="Close form"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateRequest}>
                  <div className="form-group">
                    <label htmlFor="request-title">Request Title</label>
                    <input
                      id="request-title"
                      type="text"
                      placeholder="e.g. Water leakage"
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
                      Description
                    </label>
                    <textarea
                      id="request-description"
                      placeholder="Describe the maintenance issue..."
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
                  </div>

                  <div className="form-group">
                    <label htmlFor="request-location">Location</label>
                    <input
                      id="request-location"
                      type="text"
                      placeholder="e.g. Flat 4B"
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

                  <div className="form-group">
                    <label htmlFor="request-priority">Priority</label>
                    <select
                      id="request-priority"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: e.target.value,
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

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="cancel-button"
                      disabled={submitting}
                      onClick={() => {
                        setShowForm(false)
                        resetForm()
                      }}
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
          )}

          {/* View Maintenance Request Details Modal */}
          {(detailsLoading || detailsError || selectedRequest) && (
            <div
              className="modal-overlay"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !detailsLoading) {
                  setSelectedRequest(null)
                  setDetailsError("")
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
                    onClick={() => {
                      setSelectedRequest(null)
                      setDetailsError("")
                    }}
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
                    onClick={() => {
                      setSelectedRequest(null)
                      setDetailsError("")
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">
                <ClipboardList size={22} />
              </div>
              <div>
                <p>Total Requests</p>
                <h2>{totalRequests}</h2>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon orange">
                <Clock size={22} />
              </div>
              <div>
                <p>Pending</p>
                <h2>{pendingRequests}</h2>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon purple">
                <Wrench size={22} />
              </div>
              <div>
                <p>In Progress</p>
                <h2>{inProgressRequests}</h2>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p>Completed</p>
                <h2>{completedRequests}</h2>
              </div>
            </div>
          </div>

          {/* Request Table */}
          <div className="table-card">
            <div className="table-header">
              <div>
                <h2>All Requests</h2>
                <p>
                  {filteredRequests.length} of {totalRequests} requests
                </p>
              </div>

              <div className="search-box">
                <Search size={17} />
                <input
                  type="search"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search maintenance requests"
                />
              </div>
            </div>

            {actionError && (
              <p className="form-error" role="alert">
                {actionError}
              </p>
            )}

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>REQUEST</th>
                    <th>LOCATION</th>
                    <th>PRIORITY</th>
                    <th>STATUS</th>
                    <th>DATE</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6}>
                        Loading maintenance requests...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6}>{error}</td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        {searchTerm
                          ? "No matching requests found."
                          : "No maintenance requests found."}
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <strong>{request.title}</strong>
                          <small>{request.description}</small>
                        </td>

                        <td>
                          <MapPin size={14} />
                          {request.location}
                        </td>

                        <td>
                          <span className={`badge ${request.priority}`}>
                            {request.priority.charAt(0).toUpperCase() +
                              request.priority.slice(1)}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`badge ${
                              request.status === "in_progress"
                                ? "progress"
                                : request.status
                            }`}
                          >
                            {request.status === "in_progress"
                              ? "In Progress"
                              : request.status.charAt(0).toUpperCase() +
                                request.status.slice(1)}
                          </span>
                        </td>

                        <td>
                          <CalendarDays size={14} />
                          {request.created_at
                            ? new Date(
                                request.created_at
                              ).toLocaleDateString()
                            : "N/A"}
                        </td>

                        <td>
                          <button
                            className="icon-button"
                            type="button"
                            aria-label={`Actions for ${request.title}`}
                            aria-expanded={openMenuId === request.id}
                            onClick={(e) =>
                              toggleActionMenu(request.id, e.currentTarget)
                            }
                          >
                            <MoreVertical size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Floating action menu rendered outside the table */}
      {openMenuId !== null &&
        menuPosition &&
        createPortal(
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
              onClick={() => handleViewDetails(openMenuId)}
            >
              View Details
            </button>

            <div className="action-menu-divider" />

            <p>Change Status</p>

            {(
              ["pending", "in_progress", "completed"] as RequestStatus[]
            ).map((status) => {
              const request = requests.find(
                (item) => item.id === openMenuId
              )

              if (!request) return null

              return (
                <button
                  key={status}
                  type="button"
                  disabled={request.status === status}
                  onClick={() =>
                    handleStatusChange(request.id, status)
                  }
                >
                  {status === "in_progress"
                    ? "In Progress"
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                  {request.status === status && " ✓"}
                </button>
              )
            })}

            <div className="action-menu-divider" />

            <button
              type="button"
              className="delete-action"
              onClick={() => handleDeleteRequest(openMenuId)}
            >
              Delete Request
            </button>
          </div>,
          document.body
        )}
    </div>
  )
}
