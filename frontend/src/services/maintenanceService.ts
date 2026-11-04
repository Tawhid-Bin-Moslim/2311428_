
import type { MaintenanceRequest } from "../types/maintenance";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export interface CreateMaintenanceRequest {
  title: string;
  description: string;
  location: string;
  priority: "low" | "medium" | "high";
}

// GET: Fetch all maintenance requests
export async function getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/maintenance-requests`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch maintenance requests");
  }

  return response.json();
}

// POST: Create a maintenance request
export async function createMaintenanceRequest(
  formData: CreateMaintenanceRequest
): Promise<MaintenanceRequest> {
  const response = await fetch(
    `${API_BASE_URL}/api/maintenance-requests`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      typeof errorData.detail === "string"
        ? errorData.detail
        : "Failed to create maintenance request"
    );
  }

  return response.json();
}

// GET: Fetch one maintenance request
export async function getMaintenanceRequest(
  requestId: number
): Promise<MaintenanceRequest> {
  const response = await fetch(
    `${API_BASE_URL}/api/maintenance-requests/${requestId}`
  );

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "Maintenance request not found"
        : "Failed to fetch maintenance request details"
    );
  }

  return response.json();
}

// PUT: Update maintenance request status
export async function updateMaintenanceRequest(
  requestId: number,
  newStatus: MaintenanceRequest["status"]
): Promise<MaintenanceRequest> {
  const response = await fetch(
    `${API_BASE_URL}/api/maintenance-requests/${requestId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update request status");
  }

  return response.json();
}

// DELETE: Delete a maintenance request
export async function deleteMaintenanceRequest(
  requestId: number
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/maintenance-requests/${requestId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete maintenance request");
  }
}
