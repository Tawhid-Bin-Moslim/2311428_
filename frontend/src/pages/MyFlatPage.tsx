import { useEffect, useState } from "react";

import Navbar from "../components/layout/Navbar";
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
    <>
      <Navbar />

      <section className="content">
        <div className="page-heading">
          <div>
            <h1>My Flat</h1>
            <p>View your current flat and occupancy information.</p>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <div className="building-message">
            Loading your flat information...
          </div>
        ) : !currentOccupancy ? (
          <div className="table-card">
            <div className="building-message">
              No current flat assignment was found.
            </div>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">B</div>
                <div>
                  <p>Building</p>
                  <h2>{currentOccupancy.building_name}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">F</div>
                <div>
                  <p>Flat Number</p>
                  <h2>{currentOccupancy.flat_number}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon purple">T</div>
                <div>
                  <p>Occupancy Type</p>
                  <h2>
                    {currentOccupancy.occupancy_type === "owner"
                      ? "Owner"
                      : "Tenant"}
                  </h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">D</div>
                <div>
                  <p>Floor</p>
                  <h2>{currentOccupancy.floor_number}</h2>
                </div>
              </div>
            </div>

            <div className="table-card">
              <div className="table-header">
                <div>
                  <h2>Current Occupancy</h2>
                  <p>Your assigned flat information</p>
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <tbody>
                    <tr>
                      <th>BUILDING</th>
                      <td>{currentOccupancy.building_name}</td>
                    </tr>
                    <tr>
                      <th>FLAT NUMBER</th>
                      <td>{currentOccupancy.flat_number}</td>
                    </tr>
                    <tr>
                      <th>FLOOR</th>
                      <td>{currentOccupancy.floor_number}</td>
                    </tr>
                    <tr>
                      <th>OCCUPANCY TYPE</th>
                      <td>
                        {currentOccupancy.occupancy_type === "owner"
                          ? "Owner"
                          : "Tenant"}
                      </td>
                    </tr>
                    <tr>
                      <th>MOVE-IN DATE</th>
                      <td>{currentOccupancy.move_in_date}</td>
                    </tr>
                    <tr>
                      <th>STATUS</th>
                      <td>
                        <span className="badge completed">Active</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!loading && occupancies.length > 0 && (
          <div className="table-card" style={{ marginTop: "25px" }}>
            <div className="table-header">
              <div>
                <h2>Occupancy History</h2>
                <p>Your previous and current flat assignments</p>
              </div>
            </div>

            <div className="table-wrapper">
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
                        <td>{occupancy.building_name}</td>
                        <td>{occupancy.flat_number}</td>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}