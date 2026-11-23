
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

// Keep the access token in memory.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// Shared function for communicating with the FastAPI backend.
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}
