
import { useEffect, useState } from "react";
import {
  Building2,
  DoorOpen,
  UserRound,
  Layers,
  CalendarDays,
  Home,
  History,
  Clock3,
} from "lucide-react";

import { getMyOccupancies } from "../services/occupancyService";
import type { Occupancy } from "../types/occupancy";

export default function MyFlatPage() {
  const [occupancies, setOccupancies] = useState<Occupancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMyFlat() {
      try {
        setLoading(true);
        setError("");

        const data = await getMyOccupancies();
        setOccupancies(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load your flat information"
        );
      } finally {
        setLoading(false);
      }
    }

    loadMyFlat();
  }, []);

  const currentOccupancy = occupancies.find(
    (occupancy) => occupancy.move_out_date === null
  );

  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <h1>My Flat</h1>
          <p>View your current flat and occupancy information.</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <div className="table-card">
          <div className="building-message">
            <Clock3 size={20} />
            Loading your flat information...
          </div>
        </div>
      ) : !currentOccupancy ? (
        <div className="table-card my-flat-empty">
          <div className="my-flat-empty-icon">
            <Home size={30} />
          </div>
          <h2>No Current Flat Assignment</h2>
          <p>
            Your account does not currently have an active flat assignment.
            Please contact your Building Manager if you need assistance.
          </p>
        </div>
      ) : (
        <>
          <div className="my-flat-overview">
            <div className="my-flat-overview-heading">
              <div>
                <span className="my-flat-eyebrow">CURRENT ASSIGNMENT</span>
                <h2>{currentOccupancy.building_name}</h2>
                <p>
                  Flat {currentOccupancy.flat_number} · Floor{" "}
                  {currentOccupancy.floor_number}
                </p>
              </div>

              <span className="badge completed my-flat-active-badge">
                Active
              </span>
            </div>

            <div className="my-flat-details-grid">
              <div className="my-flat-detail">
                <span className="my-flat-detail-icon blue">
                  <Building2 size={19} />
                </span>
                <div>
                  <p>Building</p>
                  <strong>{currentOccupancy.building_name}</strong>
                </div>
              </div>

              <div className="my-flat-detail">
                <span className="my-flat-detail-icon green">
                  <DoorOpen size={19} />
                </span>
                <div>
                  <p>Flat Number</p>
                  <strong>{currentOccupancy.flat_number}</strong>
                </div>
              </div>

              <div className="my-flat-detail">
                <span className="my-flat-detail-icon purple">
                  <UserRound size={19} />
                </span>
                <div>
                  <p>Occupancy Type</p>
                  <strong>
                    {currentOccupancy.occupancy_type === "owner"
                      ? "Owner"
                      : "Tenant"}
                  </strong>
                </div>
              </div>

              <div className="my-flat-detail">
                <span className="my-flat-detail-icon orange">
                  <Layers size={19} />
                </span>
                <div>
                  <p>Floor</p>
                  <strong>{currentOccupancy.floor_number}</strong>
                </div>
              </div>

              <div className="my-flat-detail">
                <span className="my-flat-detail-icon blue">
                  <CalendarDays size={19} />
                </span>
                <div>
                  <p>Move-in Date</p>
                  <strong>{currentOccupancy.move_in_date}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="table-card my-flat-current-card">
            <div className="table-header">
              <div>
                <h2>Current Occupancy</h2>
                <p>Detailed information about your assigned flat</p>
              </div>
            </div>

            <div className="my-flat-information">
              <div className="my-flat-information-row">
                <span>Building</span>
                <strong>{currentOccupancy.building_name}</strong>
              </div>

              <div className="my-flat-information-row">
                <span>Flat Number</span>
                <strong>{currentOccupancy.flat_number}</strong>
              </div>

              <div className="my-flat-information-row">
                <span>Floor</span>
                <strong>{currentOccupancy.floor_number}</strong>
              </div>

              <div className="my-flat-information-row">
                <span>Occupancy Type</span>
                <strong>
                  {currentOccupancy.occupancy_type === "owner"
                    ? "Owner"
                    : "Tenant"}
                </strong>
              </div>

              <div className="my-flat-information-row">
                <span>Move-in Date</span>
                <strong>{currentOccupancy.move_in_date}</strong>
              </div>

              <div className="my-flat-information-row">
                <span>Status</span>
                <span className="badge completed">Active</span>
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && occupancies.length > 0 && (
        <div className="table-card my-flat-history-card">
          <div className="table-header">
            <div className="my-flat-history-heading">
              <span className="my-flat-history-icon">
                <History size={19} />
              </span>
              <div>
                <h2>Occupancy History</h2>
                <p>Your previous and current flat assignments</p>
              </div>
            </div>

            <span className="my-flat-record-count">
              {occupancies.length} record(s)
            </span>
          </div>

          <div className="table-wrapper my-flat-history-wrapper">
            <table>
              <thead>
                <tr>
                  <th>BUILDING</th>
                  <th>FLAT</th>
                  <th>TYPE</th>
                  <th>MOVE IN</th>
                  <th>MOVE OUT</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {occupancies.map((occupancy) => {
                  const isActive = occupancy.move_out_date === null;

                  return (
                    <tr key={occupancy.id}>
                      <td>
                        <strong>{occupancy.building_name}</strong>
                      </td>

                      <td>{occupancy.flat_number}</td>

                      <td>
                        {occupancy.occupancy_type === "owner"
                          ? "Owner"
                          : "Tenant"}
                      </td>

                      <td>{occupancy.move_in_date}</td>
                      <td>{occupancy.move_out_date ?? "—"}</td>

                      <td>
                        <span
                          className={`badge ${
                            isActive ? "completed" : "pending"
                          }`}
                        >
                          {isActive ? "Active" : "Ended"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
