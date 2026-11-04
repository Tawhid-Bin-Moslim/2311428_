export interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  location: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  created_at: string;
}