
export type UserRole = "admin" | "building_manager" | "resident";

export interface LoginRequest {
  role: UserRole;
  user_id: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  user_id: string;
  full_name: string;
  is_super_admin: boolean;
}

export interface AuthUser {
  role: UserRole;
  user_id: string;
  full_name: string;
  is_super_admin: boolean;
}
