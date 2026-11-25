export type AnnouncementCategory =
  | "general"
  | "maintenance"
  | "billing"
  | "security";

export type AnnouncementStatus =
  | "draft"
  | "published"
  | "archived";

export interface Announcement {
  id: string;
  building_id: string | null;
  created_by: string;
  created_by_name: string;
  title: string;
  description: string;
  category: AnnouncementCategory;
  status: AnnouncementStatus;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface CreateAnnouncement {
  building_id: string | null;
  title: string;
  description: string;
  category: AnnouncementCategory;
  status: "draft" | "published";
  expires_at: string | null;
}

export interface UpdateAnnouncement {
  title?: string;
  description?: string;
  category?: AnnouncementCategory;
  status?: "draft" | "published";
  expires_at?: string | null;
}