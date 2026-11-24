import { apiFetch } from "./api";
import type {
  Building,
  CreateBuilding,
  UpdateBuilding,
} from "../types/building";

// GET: Fetch buildings visible to the logged-in user.
export async function getBuildings(): Promise<Building[]> {
  const response = await apiFetch("/api/buildings");

  if (!response.ok) {
    throw new Error("Failed to fetch buildings");
  }

  return response.json();
}

// GET: Fetch one building.
export async function getBuilding(
  buildingId: string
): Promise<Building> {
  const response = await apiFetch(
    `/api/buildings/${buildingId}`
  );

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "Building not found"
        : "Failed to fetch building details"
    );
  }

  return response.json();
}

// POST: Admin creates a building.
export async function createBuilding(
  buildingData: CreateBuilding
): Promise<Building> {
  const response = await apiFetch("/api/buildings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildingData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    throw new Error(
      typeof errorData.detail === "string"
        ? errorData.detail
        : "Failed to create building"
    );
  }

  return response.json();
}

// PUT: Admin updates a building.
export async function updateBuilding(
  buildingId: string,
  buildingData: UpdateBuilding
): Promise<Building> {
  const response = await apiFetch(
    `/api/buildings/${buildingId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildingData),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    throw new Error(
      typeof errorData.detail === "string"
        ? errorData.detail
        : "Failed to update building"
    );
  }

  return response.json();
}