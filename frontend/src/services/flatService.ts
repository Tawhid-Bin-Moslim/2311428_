import { apiFetch } from "./api";
import type { Flat, CreateFlat, UpdateFlat } from "../types/flat";

async function getError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));

  return typeof data.detail === "string"
    ? data.detail
    : fallback;
}

// GET: List flats. Admin can optionally filter by building.
export async function getFlats(
  buildingId?: string
): Promise<Flat[]> {
  const query = buildingId
    ? `?building_id=${encodeURIComponent(buildingId)}`
    : "";

  const response = await apiFetch(`/api/flats${query}`);

  if (!response.ok) {
    throw new Error(await getError(response, "Failed to fetch flats"));
  }

  return response.json();
}

// GET: One flat.
export async function getFlat(flatId: string): Promise<Flat> {
  const response = await apiFetch(`/api/flats/${flatId}`);

  if (!response.ok) {
    throw new Error(await getError(response, "Failed to fetch flat"));
  }

  return response.json();
}

// POST: Create flat.
export async function createFlat(data: CreateFlat): Promise<Flat> {
  const response = await apiFetch("/api/flats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await getError(response, "Failed to create flat"));
  }

  return response.json();
}

// PUT: Update flat.
export async function updateFlat(
  flatId: string,
  data: UpdateFlat
): Promise<Flat> {
  const response = await apiFetch(`/api/flats/${flatId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await getError(response, "Failed to update flat"));
  }

  return response.json();
}