import { apiFetch } from "./api";

import type {
  Announcement,
  CreateAnnouncement,
  UpdateAnnouncement,
} from "../types/announcement";

async function getErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  const data = await response.json().catch(() => ({}));

  return typeof data.detail === "string"
    ? data.detail
    : fallback;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const response = await apiFetch("/api/announcements");

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Failed to load announcements."
      )
    );
  }

  return response.json();
}

export async function createAnnouncement(
  data: CreateAnnouncement
): Promise<Announcement> {
  const response = await apiFetch("/api/announcements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Failed to create announcement."
      )
    );
  }

  return response.json();
}

export async function updateAnnouncement(
  id: string,
  data: UpdateAnnouncement
): Promise<Announcement> {
  const response = await apiFetch(
    `/api/announcements/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Failed to update announcement."
      )
    );
  }

  return response.json();
}

export async function archiveAnnouncement(
  id: string
): Promise<void> {
  const response = await apiFetch(
    `/api/announcements/${id}/archive`,
    {
      method: "PATCH",
    }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Failed to archive announcement."
      )
    );
  }
}