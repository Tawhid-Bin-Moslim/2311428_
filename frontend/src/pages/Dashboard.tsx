
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import type { MaintenanceRequest } from "../types/maintenance";

import {
  getMaintenanceRequests,
  createMaintenanceRequest,
  getMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
  type CreateMaintenanceRequest,
} from "../services/maintenanceService";

import Navbar from "../components/layout/Navbar";
import MaintenanceStats from "../components/maintenance/MaintenanceStats";
import MaintenanceTable from "../components/maintenance/MaintenanceTable";
import RequestFormModal from "../components/maintenance/RequestFormModal";
import RequestDetailsModal from "../components/maintenance/RequestDetailsModal";
import RequestActionMenu from "../components/maintenance/RequestActionMenu";

interface MenuPosition {
  top: number;
  left: number;
}

type RequestStatus = MaintenanceRequest["status"];

const initialFormData: CreateMaintenanceRequest = {
  title: "",
  description: "",
  location: "",
  priority: "medium",
};

export default function Dashboard() {
  // Maintenance request state
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search and action menu state
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [actionError, setActionError] = useState("");

  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionButtonRef = useRef<HTMLButtonElement>(null);

  // Request details state
  const [selectedRequest, setSelectedRequest] =
    useState<MaintenanceRequest | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  // New request form state
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] =
    useState<CreateMaintenanceRequest>(initialFormData);

  // Fetch all maintenance requests
  useEffect(() => {
    async function fetchRequests() {
      try {
        const data = await getMaintenanceRequests();
        setRequests(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        actionMenuRef.current?.contains(target) ||
        actionButtonRef.current?.contains(target)
      ) {
        return;
      }

      setOpenMenuId(null);
      setMenuPosition(null);
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close menu when scrolling or resizing
  useEffect(() => {
    if (openMenuId === null) return;

    function closeMenu() {
      setOpenMenuId(null);
      setMenuPosition(null);
    }

    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);

    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [openMenuId]);

  // Search maintenance requests
  const filteredRequests = requests.filter((request) => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return true;

    return (
      request.title.toLowerCase().includes(search) ||
      request.description.toLowerCase().includes(search) ||
      request.location.toLowerCase().includes(search) ||
      request.priority.toLowerCase().includes(search) ||
      request.status.replace("_", " ").toLowerCase().includes(search)
    );
  });

  // Dynamic statistics
  const totalRequests = requests.length;

  const pendingRequests = requests.filter(
    (request) => request.status === "pending"
  ).length;

  const inProgressRequests = requests.filter(
    (request) => request.status === "in_progress"
  ).length;

  const completedRequests = requests.filter(
    (request) => request.status === "completed"
  ).length;

  // Reset form
  function resetForm() {
    setFormData({ ...initialFormData });
    setFormError("");
  }

  // Create maintenance request
  async function handleCreateRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const newRequest = await createMaintenanceRequest(formData);

      setRequests((previousRequests) => [
        newRequest,
        ...previousRequests,
      ]);

      resetForm();
      setShowForm(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Open or close the action menu
  function toggleActionMenu(
    requestId: number,
    button: HTMLButtonElement
  ) {
    if (openMenuId === requestId) {
      setOpenMenuId(null);
      setMenuPosition(null);
      return;
    }

    const rect = button.getBoundingClientRect();

    const menuWidth = 190;
    const menuHeight = 260;
    const spacing = 8;

    const spaceBelow = window.innerHeight - rect.bottom;

    const shouldOpenAbove =
      spaceBelow < menuHeight + spacing &&
      rect.top > menuHeight + spacing;

    const top = shouldOpenAbove
      ? rect.top - menuHeight - spacing
      : rect.bottom + spacing;

    const left = Math.max(
      8,
      Math.min(
        rect.right - menuWidth,
        window.innerWidth - menuWidth - 8
      )
    );

    actionButtonRef.current = button;
    setMenuPosition({ top, left });
    setOpenMenuId(requestId);
  }

  // Fetch a single maintenance request
  async function handleViewDetails(requestId: number) {
    setOpenMenuId(null);
    setMenuPosition(null);

    setSelectedRequest(null);
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const data = await getMaintenanceRequest(requestId);
      setSelectedRequest(data);
    } catch (err) {
      setDetailsError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  // Update maintenance request status
  async function handleStatusChange(
    requestId: number,
    newStatus: RequestStatus
  ) {
    setActionError("");
    setOpenMenuId(null);
    setMenuPosition(null);

    try {
      const updatedRequest = await updateMaintenanceRequest(
        requestId,
        newStatus
      );

      setRequests((previousRequests) =>
        previousRequests.map((request) =>
          request.id === requestId ? updatedRequest : request
        )
      );

      if (selectedRequest?.id === requestId) {
        setSelectedRequest(updatedRequest);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
  }

  // Delete maintenance request
  async function handleDeleteRequest(requestId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this maintenance request?"
    );

    if (!confirmed) return;

    setActionError("");
    setOpenMenuId(null);
    setMenuPosition(null);

    try {
      await deleteMaintenanceRequest(requestId);

      setRequests((previousRequests) =>
        previousRequests.filter((request) => request.id !== requestId)
      );

      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
  }

  // Close request details
  function closeDetails() {
    setSelectedRequest(null);
    setDetailsError("");
  }

  // Close new request form
  function closeForm() {
    setShowForm(false);
  }

  return (
    <>
      <Navbar />

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
              setFormError("");
              setShowForm(true);
            }}
          >
            New Request
          </button>
        </div>

        {/* Statistics */}
        <MaintenanceStats
          totalRequests={totalRequests}
          pendingRequests={pendingRequests}
          inProgressRequests={inProgressRequests}
          completedRequests={completedRequests}
        />

        {/* New Request Modal */}
        <RequestFormModal
          showForm={showForm}
          submitting={submitting}
          formError={formError}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreateRequest}
          onClose={closeForm}
          onReset={resetForm}
        />

        {/* Request Details Modal */}
        <RequestDetailsModal
          detailsLoading={detailsLoading}
          detailsError={detailsError}
          selectedRequest={selectedRequest}
          onClose={closeDetails}
        />

        {/* Maintenance Requests Table */}
        <MaintenanceTable
          filteredRequests={filteredRequests}
          totalRequests={totalRequests}
          loading={loading}
          error={error}
          actionError={actionError}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          openMenuId={openMenuId}
          toggleActionMenu={toggleActionMenu}
        />

        {/* Floating Action Menu */}
        <RequestActionMenu
          openMenuId={openMenuId}
          menuPosition={menuPosition}
          actionMenuRef={actionMenuRef}
          requests={requests}
          onViewDetails={handleViewDetails}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteRequest}
        />
      </section>
    </>
  );
}
