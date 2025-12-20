// ===== COMMON TYPES =====
export type PlantPhase = 'germinacao' | 'muda' | 'vegetacao' | 'floracao';
export type PlantStatus = 'ativa' | 'morta' | 'colhida' | 'falha_germinacao';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// ===== PHASE HISTORY TYPES =====
export interface PhaseHistory {
  id?: number;
  plant_id: number;
  phase: PlantPhase;
  started_at: string;
  ended_at?: string;
  duration_days?: number;
  notes?: string;
  created_at?: string;
}

// ===== PLANT TYPES =====
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
  current_phase: PlantPhase;
  current_location?: string;
  status: PlantStatus;
  failure_date?: string;
  failure_reason?: string;
  photo_path?: string;
  created_at?: string;
  updated_at?: string;
  phase_history?: PhaseHistory[];
  seed_batch_id?: number;
}

// ===== DAILY RECORD TYPES =====
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
  updated_at?: string;
}

// ===== GENETIC TYPES =====
export interface Genetic {
  id: number;
  name: string;
  breeder: string;
  description?: string;
  is_active: boolean;
  active_batches: number;
  total_seeds: number;
  total_plants: number;
  created_at: string;
  updated_at: string;
}

// ===== SEED BATCH TYPES =====
export interface SeedBatch {
  id: number;
  genetic_strain_id: number;
  batch_code: string;
  quantity: number;
  current_quantity: number;
  harvest_date?: string;
  expiration_date?: string;
  location?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ===== SENSOR TYPES =====
export interface Sensor {
  id: number;
  name: string;
  type: 'temperature' | 'humidity' | 'light' | 'ph' | 'ec' | 'co2';
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SensorReading {
  id: number;
  sensor_id: number;
  value: number;
  unit: string;
  timestamp: string;
  created_at: string;
}

// ===== STATISTICS TYPES =====
export interface PlantStatistics {
  total_plants: number;
  active_plants: number;
  germinated_plants: number;
  dead_plants: number;
  harvested_plants: number;
  germination_rate: number;
  avg_germination_days?: number;
}

export interface GeneticMetrics {
  genetic_id: number;
  genetic_name: string;
  breeder: string;
  total_plants: number;
  active_plants: number;
  germinated_plants: number;
  dead_plants: number;
  harvested_plants: number;
  germination_rate: number;
  total_batches: number;
  total_seeds_available: number;
  last_activity: string;
  success_score: number;
}

export interface Statistics {
  plants: PlantStatistics;
  genetics: GeneticMetrics[];
  sensors: {
    total_sensors: number;
    active_sensors: number;
    readings_today: number;
  };
}

// ===== API RESPONSE TYPES =====
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===== FORM TYPES =====
export interface PlantFormData {
  name: string;
  genetic?: string;
  substrate: string;
  substrate_other?: string;
  current_location?: string;
  photo_path?: string;
}

export interface RecordFormData {
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

// ===== FILTER TYPES =====
export interface PlantFilters {
  phase?: PlantPhase;
  genetic?: string;
  status?: PlantStatus;
  location?: string;
}

export interface RecordFilters {
  plant_id?: number;
  date_from?: string;
  date_to?: string;
  location?: string;
}

// ===== COMPONENT PROPS TYPES =====
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingProps extends BaseComponentProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface ErrorProps extends BaseComponentProps {
  message: string;
  onRetry?: () => void;
}

export interface EmptyStateProps extends BaseComponentProps {
  icon?: string;
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
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
