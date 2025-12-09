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
  created_at?: string;
  phase_history?: PhaseHistory[];
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
