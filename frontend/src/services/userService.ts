import { apiFetch } from "./api";
import type { UserRole } from "../types/auth";
import type { OccupancyType } from "../types/occupancy";

export interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  login_id: string | null;
  is_active: boolean;
  is_super_admin: boolean;
}

export interface ChangeUserRoleRequest {
  role: UserRole;
  building_id?: string;
  flat_id?: string;
  occupancy_type?: OccupancyType;
}

export interface CreateAdminRequest {
  full_name: string;
  email: string;
  password: string;
}

export interface CreateAdminResponse {
  id: string;
  full_name: string;
  email: string;
  role: "admin";
  login_id: string;
  message: string;
}
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

// Admin: retrieve user accounts.
export async function getAdminUsers(): Promise<ManagedUser[]> {
  const response = await apiFetch("/api/admin/users");

  return handleResponse<ManagedUser[]>(
    response,
    "Failed to fetch user accounts"
  );
}

// Admin: change a user's role.
export async function changeUserRole(
  userId: string,
  data: ChangeUserRoleRequest
): Promise<ManagedUser> {
  const response = await apiFetch(
    `/api/admin/users/${userId}/role`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  return handleResponse<ManagedUser>(
    response,
    "Failed to change user role"
  );
}

export async function createAdminAccount(
  data: CreateAdminRequest
): Promise<CreateAdminResponse> {
  const response = await apiFetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleResponse<CreateAdminResponse>(
    response,
    "Failed to create Administrator account"
  );
}
