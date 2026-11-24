import { apiFetch } from "./api";
import type {
  Occupancy,
  CreateOccupancy,
  UpdateOccupancy,
} from "../types/occupancy";

async function handleResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    throw new Error(
      typeof errorData.detail === "string"
        ? errorData.detail
        : fallbackMessage
    );
  }

  return response.json();
}

// Admin: get all occupancy records.
export async function getOccupancies(): Promise<Occupancy[]> {
  const response = await apiFetch("/api/occupancies");

  return handleResponse<Occupancy[]>(
    response,
    "Failed to fetch occupancy records"
  );
}

// Resident: get only their own occupancy records.
export async function getMyOccupancies(): Promise<Occupancy[]> {
  const response = await apiFetch("/api/occupancies/me");

  return handleResponse<Occupancy[]>(
    response,
    "Failed to fetch your flat information"
  );
}

// Admin: assign a Resident to a flat.
export async function createOccupancy(
  data: CreateOccupancy
): Promise<Occupancy> {
  const response = await apiFetch("/api/occupancies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Occupancy>(
    response,
    "Failed to assign Resident to flat"
  );
}

// Admin: update occupancy type.
export async function updateOccupancy(
  occupancyId: string,
  data: UpdateOccupancy
): Promise<Occupancy> {
  const response = await apiFetch(
    `/api/occupancies/${occupancyId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  return handleResponse<Occupancy>(
    response,
    "Failed to update occupancy"
  );
}

// Admin: end an active occupancy.
export async function endOccupancy(
  occupancyId: string
): Promise<Occupancy> {
  const response = await apiFetch(
    `/api/occupancies/${occupancyId}/end`,
    {
      method: "PATCH",
    }
  );

  return handleResponse<Occupancy>(
    response,
    "Failed to end occupancy"
  );
}