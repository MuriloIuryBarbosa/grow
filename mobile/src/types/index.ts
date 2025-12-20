// Phase History Types
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

// ============================================
// GENETIC BANK TYPES
// ============================================

// Genetic Strain - Catálogo de genéticas
export interface GeneticStrain {
  id?: number;
  name: string;
  breeder?: string;
  type?: 'indica' | 'sativa' | 'hybrid' | 'ruderalis' | 'unknown';
  indica_percentage?: number;
  sativa_percentage?: number;
  flowering_time_min?: number;
  flowering_time_max?: number;
  height_indoor?: string;
  height_outdoor?: string;
  yield_indoor?: string;
  yield_outdoor?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  thc_content?: number;
  cbd_content?: number;
  thc_percentage?: string;
  cbd_percentage?: string;
  flavors?: string;
  effects?: string;
  description?: string;
  grow_notes?: string;
  photo_path?: string;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
  // Campos calculados da view
  active_batches?: number;
  total_seeds?: number;
  total_plants?: number;
}

// Seed Batch - Lote de sementes
export interface SeedBatch {
  id?: number;
  genetic_strain_id?: number;
  batch_code: string;
  source?: string;
  source_type?: 'purchased' | 'gifted' | 'harvested' | 'traded';
  acquisition_date?: string;
  initial_quantity: number;
  current_quantity: number;
  seeds_germinated?: number;
  seed_type?: 'regular' | 'feminized' | 'autoflower' | 'cbd' | 'unknown';
  generation?: string;
  storage_location?: string;
  storage_conditions?: string;
  expiration_date?: string;
  germination_rate?: number;
  plants_generated?: number;
  price?: number;
  notes?: string;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
  // Campos da view v_seed_batches_full
  genetic_name?: string;
  breeder?: string;
  genetic_type?: string;
  flowering_time_min?: number;
  flowering_time_max?: number;
}

// Clone - Clones de plantas mãe
export interface Clone {
  id?: number;
  mother_plant_id: number;
  clone_code: string;
  cut_date: string;
  rooting_date?: string;
  days_to_root?: number;
  status: 'cutting' | 'rooting' | 'rooted' | 'planted' | 'failed' | 'discarded';
  destination_plant_id?: number;
  rooting_method?: string;
  rooting_medium?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Campos da view v_clones_full
  mother_plant_name?: string;
  mother_plant_code?: string;
  mother_genetic?: string;
  destination_plant_name?: string;
  destination_plant_code?: string;
}

// ============================================
// PLANT TYPES (atualizado)
// ============================================

// Plant Types
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
  genetic_strain_id?: number;
  seed_batch_id?: number;
  source_clone_id?: number;
  origin_type?: 'seed' | 'clone' | 'unknown';
  created_at?: string;
  phase_history?: PhaseHistory[];
  // Campos da view v_plants_genetic_trace
  seed_batch_code?: string;
  genetic_strain_name?: string;
  genetic_breeder?: string;
  genetic_type?: string;
  source_clone_code?: string;
  mother_plant_name?: string;
  mother_plant_code?: string;
}

// Daily Record Types
export interface DailyRecord {
  id?: number;
  plant_id: number;
  record_date: string;
  plant_size?: number;
  leaf_count?: number;
  branch_count?: number;
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

// Statistics Types
export interface Statistics {
  total_plants: number;
  by_phase: {
    germinacao: number;
    muda: number;
    vegetacao: number;
    floracao: number;
  };
  avg_germination_days?: number;
  avg_ppfd?: number;
  avg_vpd?: number;
  avg_phase_durations?: {
    germinacao?: number;
    muda?: number;
    vegetacao?: number;
    floracao?: number;
  };
}

// Sensor Types
export interface Sensor {
  id?: number;
  name: string;
  type: 'temperature' | 'humidity' | 'temperature_humidity';
  location: string;
  description?: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface SensorReading {
  id?: number;
  sensor_id: number;
  temperature?: number;
  humidity?: number;
  recorded_at: string;
  notes?: string;
  created_at?: string;
  sensor_name?: string;
  location?: string;
}

export interface LatestSensorReading {
  sensor_id: number;
  sensor_name: string;
  location: string;
  temperature?: number;
  humidity?: number;
  recorded_at: string;
  notes?: string;
}

export interface DailySensorAverage {
  sensor_id: number;
  sensor_name: string;
  location: string;
  date: string;
  avg_temperature?: number;
  avg_humidity?: number;
  min_temperature?: number;
  max_temperature?: number;
  min_humidity?: number;
  max_humidity?: number;
  reading_count: number;
}

export interface SensorStats {
  total_readings: number;
  total_sensors?: number;
  avg_temperature?: number;
  min_temperature?: number;
  max_temperature?: number;
  avg_humidity?: number;
  min_humidity?: number;
  max_humidity?: number;
  first_reading?: string;
  last_reading?: string;
}

// ============================================
// GENETIC METRICS TYPES
// ============================================

export interface GeneticMetrics {
  genetic_id: number;
  genetic_name: string;
  breeder?: string;
  total_plants: number;
  active_plants: number;
  germinated_plants: number;
  dead_plants: number;
  harvested_plants: number;
  germination_rate: number;
  avg_germination_days?: number;
  avg_vegetation_days?: number;
  avg_flowering_days?: number;
  total_yield?: number;
  avg_yield_per_plant?: number;
  success_score: number;
  total_batches: number;
  total_seeds_used: number;
  total_seeds_available: number;
  clones_generated: number;
  last_activity: string;
}
