export type OccupancyType = "owner" | "tenant";

export interface Occupancy {
  id: string;
  resident_id: string;
  resident_name: string;
  resident_email: string;
  flat_id: string;
  flat_number: string;
  floor_number: number;
  building_id: string;
  building_name: string;
  occupancy_type: OccupancyType;
  move_in_date: string;
  move_out_date: string | null;
}

export interface CreateOccupancy {
  resident_id: string;
  flat_id: string;
  occupancy_type: OccupancyType;
  move_in_date: string;
}

export interface UpdateOccupancy {
  occupancy_type: OccupancyType;
}