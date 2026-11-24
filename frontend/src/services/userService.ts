import { apiFetch } from "./api";

export interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "building_manager" | "resident";
  login_id: string | null;
  is_active: boolean;
}

export async function getAdminUsers(): Promise<ManagedUser[]> {
  const response = await apiFetch("/api/admin/users");

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    throw new Error(
      typeof errorData.detail === "string"
        ? errorData.detail
        : "Failed to fetch users"
    );
  }

  return response.json();
}