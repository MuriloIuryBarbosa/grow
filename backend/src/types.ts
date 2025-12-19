export interface Plant {
  id?: number;
  name: string;
  genetic?: string;
  code: string;
  planting_date: string;
  germination_date?: string;
  days_to_germination?: number;
  substrate: string;
  substrate_other?: string;
  current_phase: 'germinacao' | 'muda' | 'vegetacao' | 'floracao';
  current_location?: string;
  status: 'ativa' | 'morta' | 'falha_germinacao';
  failure_date?: string;
  failure_reason?: string;
  photo_path?: string;
  profile_photo?: string;
  // Campos de rastreabilidade genética
  seed_batch_id?: number;
  source_clone_id?: number;
  origin_type?: 'seed' | 'clone' | 'unknown';
  // Campos calculados (JOIN com seed_batches e genetic_strains)
  seed_batch_code?: string;
  genetic_strain_name?: string;
  genetic_breeder?: string;
  created_at?: string;
}

export interface PhaseHistory {
  id?: number;
  plant_id: number;
  phase: 'germinacao' | 'muda' | 'vegetacao' | 'floracao';
  started_at: string;
  ended_at?: string;
  duration_days?: number;
  notes?: string;
  created_at?: string;
}

export interface DailyRecord {
  id?: number;
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
  created_at?: string;
}

export interface PlantWithRecords extends Plant {
  records?: DailyRecord[];
  phase_history?: PhaseHistory[];
  stats?: {
    days_in_current_phase?: number;
    phase_durations?: {
      germinacao?: number;
      muda?: number;
      vegetacao?: number;
      floracao?: number;
    };
  };
}

export interface Statistics {
  total_plants: number;
  by_phase: {
    germinacao: number;
    muda: number;
    vegetacao: number;
    floracao: number;
  };
  avg_germination_days?: number;
  avg_temperature?: number;
  avg_humidity?: number;
  avg_ppfd?: number;
  avg_vpd?: number;
  avg_phase_durations?: {
    germinacao?: number;
    muda?: number;
    vegetacao?: number;
    floracao?: number;
  };
}

export interface GeneticStrain {
  id?: number;
  name: string;
  breeder?: string;
  description?: string;
  type?: string;
  indica_percentage?: number;
  sativa_percentage?: number;
  flowering_time?: number;
  flowering_time_min?: number;
  flowering_time_max?: number;
  height_indoor?: number;
  height_outdoor?: number;
  yield_indoor?: number;
  yield_outdoor?: number;
  difficulty?: string;
  thc_content?: number;
  thc_percentage?: number;
  cbd_content?: number;
  cbd_percentage?: number;
  flavors?: string[];
  effects?: string[];
  grow_notes?: string;
  photo_path?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SeedBatch {
  id?: number;
  genetic_strain_id: number;
  batch_code: string;
  quantity_total: number;
  quantity_available: number;
  source?: string;
  source_type?: string;
  acquisition_date?: string;
  purchase_date: string;
  initial_quantity?: number;
  current_quantity?: number;
  seed_type?: string;
  generation?: number;
  storage_location?: string;
  storage_conditions?: string;
  expiration_date?: string;
  price_per_unit?: number;
  supplier?: string;
  germination_rate?: number;
  plants_generated?: number;
  is_active?: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Campos calculados (JOIN com genetic_strains)
  genetic_strain_name?: string;
  genetic_breeder?: string;
  genetic_name?: string;
}

export interface Clone {
  id?: number;
  plant_id: number;
  clone_date: string;
  quantity: number;
  notes?: string;
  created_at?: string;
}
