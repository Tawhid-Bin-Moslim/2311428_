export interface Building {
  id: string;
  building_code: string;
  name: string;
  address: string;
  total_floors: number;
  total_flats: number;
  contact_phone: string | null;
  status: "active" | "inactive";
}

export interface CreateBuilding {
  building_code: string;
  name: string;
  address: string;
  total_floors: number;
  total_flats: number;
  contact_phone: string;
}

export interface UpdateBuilding {
  name?: string;
  address?: string;
  total_floors?: number;
  total_flats?: number;
  contact_phone?: string | null;
  status?: "active" | "inactive";
}