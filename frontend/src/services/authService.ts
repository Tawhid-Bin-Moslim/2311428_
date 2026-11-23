
import { apiFetch, setAccessToken } from "./api";
import type { LoginRequest, LoginResponse } from "../types/auth";

export async function login(
  credentials: LoginRequest
): Promise<LoginResponse> {
  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Login failed. Please check your credentials."
    );
  }

  const loginData = data as LoginResponse;

  setAccessToken(loginData.access_token);

  return loginData;
}

export function logout(): void {
  setAccessToken(null);
}
