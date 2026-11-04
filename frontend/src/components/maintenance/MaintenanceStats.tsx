import {
  ClipboardList,
  Clock,
  Wrench,
  CheckCircle2,
} from "lucide-react";

interface MaintenanceStatsProps {
  totalRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  completedRequests: number;
}

export default function MaintenanceStats({
  totalRequests,
  pendingRequests,
  inProgressRequests,
  completedRequests,
}: MaintenanceStatsProps) {
  return (
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
  );
}