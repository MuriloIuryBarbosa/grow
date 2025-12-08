export interface CreateDailyRecordDTO {
  plant_id: number;
  record_date: string;
  plant_size?: number;
  leaf_count?: number;
  branch_count?: number;
  temperature?: number;
  humidity?: number;
  ppfd?: number;
  vpd?: number;
  fertilization?: string;
  observations?: string;
  location?: string;
  photo_path?: string;
}

export interface UpdateDailyRecordDTO {
  record_date?: string;
  plant_size?: number;
  leaf_count?: number;
  branch_count?: number;
  temperature?: number;
  humidity?: number;
  ppfd?: number;
  vpd?: number;
  fertilization?: string;
  observations?: string;
  location?: string;
  photo_path?: string;
}

export interface DailyRecordResponseDTO {
  id: number;
  plant_id: number;
  record_date: string;
  plant_size?: number;
  leaf_count?: number;
  branch_count?: number;
  temperature?: number;
  humidity?: number;
  ppfd?: number;
  vpd?: number;
  fertilization?: string;
  observations?: string;
  location?: string;
  photo_path?: string;
  created_at: string;
}
