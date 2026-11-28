export type ResidentOccupancyType = "owner" | "tenant";

export interface ResidentRecord {
  id: string;
  full_name: string;
  email: string;
  role: "resident";
  is_active: boolean;
  flat_id: string;
  flat_number: string;
  floor_number: number;
  building_id: string;
  building_name: string;
  occupancy_type: ResidentOccupancyType;
  move_in_date: string;
}

export interface CreateResidentRequest {
  full_name: string;
  email: string;
  flat_id: string;
  password: string;
  occupancy_type: ResidentOccupancyType;
}

export interface ResidentActionResponse {
  id: string;
  message: string;
}