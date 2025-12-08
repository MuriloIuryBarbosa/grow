import { PlantPhase, PlantStatus } from '../domain/entities/Plant';

export interface CreatePlantDTO {
  name: string;
  genetic: string;
  code?: string;
  planting_date: string;
  germination_date?: string;
  substrate: string;
  substrate_other?: string;
  current_location: string;
}

export interface UpdatePlantDTO {
  name?: string;
  genetic?: string;
  code?: string;
  germination_date?: string;
  planting_date?: string;
  substrate?: string;
  substrate_other?: string;
  current_location?: string;
}

export interface UpdatePlantStatusDTO {
  status: PlantStatus;
  failure_date?: string;
  failure_reason?: string;
}

export interface PlantResponseDTO {
  id: number;
  name: string;
  genetic: string;
  code?: string;
  planting_date: string;
  germination_date?: string;
  days_to_germination?: number;
  substrate: string;
  substrate_other?: string;
  current_phase: PlantPhase;
  current_location: string;
  status: PlantStatus;
  failure_date?: string;
  failure_reason?: string;
  photo_path?: string;
  created_at: string;
  days_in_phase?: number;
  total_growth_days?: number;
  records?: any[];
  phase_history?: any[];
}
