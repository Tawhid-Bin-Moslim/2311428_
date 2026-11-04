
import { Search, MapPin, CalendarDays, MoreVertical } from "lucide-react";
import type { MaintenanceRequest } from "../../types/maintenance";

interface MaintenanceTableProps {
  filteredRequests: MaintenanceRequest[];
  totalRequests: number;
  loading: boolean;
  error: string;
  actionError: string;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  openMenuId: number | null;
  toggleActionMenu: (
    requestId: number,
    button: HTMLButtonElement
  ) => void;
}

export default function MaintenanceTable({
  filteredRequests,
  totalRequests,
  loading,
  error,
  actionError,
  searchTerm,
  setSearchTerm,
  openMenuId,
  toggleActionMenu,
}: MaintenanceTableProps) {
  return (
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
  );
}
