import { apiFetch } from "./api";
import type {
  ResidentRecord,
  CreateResidentRequest,
  ResidentActionResponse,
} from "../types/resident";

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

  return response.json() as Promise<T>;
}

export async function getResidents(): Promise<ResidentRecord[]> {
  const response = await apiFetch("/api/residents");

  return handleResponse(
    response,
    "Failed to load Residents"
  );
}

export async function createResident(
  data: CreateResidentRequest
): Promise<ResidentRecord> {
  const response = await apiFetch("/api/residents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleResponse(
    response,
    "Failed to create Resident account"
  );
}

export async function resetAccountPassword(
  userId: string,
  password: string
): Promise<ResidentActionResponse> {
  const response = await apiFetch(
    `/api/users/${userId}/password`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    }
  );

  return handleResponse(
    response,
    "Failed to reset account password"
  );
}

export async function deactivateResident(
  userId: string
): Promise<ResidentActionResponse> {
  const response = await apiFetch(
    `/api/residents/${userId}`,
    {
      method: "DELETE",
    }
  );

  return handleResponse(
    response,
    "Failed to deactivate Resident account"
  );
}