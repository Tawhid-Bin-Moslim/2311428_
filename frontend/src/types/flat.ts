export interface Flat {
  id: string;
  building_id: string;
  flat_number: string;
  floor_number: number;
}

export interface CreateFlat {
  building_id: string;
  flat_number: string;
  floor_number: number;
}

export interface UpdateFlat {
  flat_number: string;
  floor_number: number;
}