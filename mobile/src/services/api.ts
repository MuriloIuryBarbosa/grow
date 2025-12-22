import axios from 'axios';
import { Plant, DailyRecord, Statistics, Sensor, SensorReading, GeneticStrain, SeedBatch, Clone } from '../types';

// Para desenvolvimento, use o IP da sua máquina (não localhost)
// iOS: Use o IP da rede local
// Android Emulator: Use 'http://10.0.2.2:3000'
export const API_BASE_URL = 'http://192.168.1.6:3000';
const API_URL = `${API_BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Plants API
export const plantsAPI = {
  getAll: async () => {
    const { data } = await api.get<Plant[]>('/plants');
    return data;
  },
  
  getById: async (id: number) => {
    const { data } = await api.get<Plant>(`/plants/${id}`);
    return data;
  },
  
  create: async (plantData: Partial<Plant>) => {
    const { data } = await api.post<Plant>('/plants', plantData);
    return data;
  },
  
  update: async (id: number, plantData: Partial<Plant>) => {
    const { data } = await api.put<Plant>(`/plants/${id}`, plantData);
    return data;
  },
  
  delete: async (id: number) => {
    await api.delete(`/plants/${id}`);
  },
  
  updatePhase: async (id: number, phase: Plant['current_phase']) => {
    const { data } = await api.put<Plant>(`/plants/${id}/phase`, { phase });
    return data;
  },

  updateProfilePhoto: async (id: number, photoUri: string) => {
    const { data } = await api.patch<Plant>(`/plants/${id}/profile-photo`, { profile_photo: photoUri });
    return data;
  },

  updateStatus: async (id: number, status: Plant['status'], failureReason?: string) => {
    const { data } = await api.patch<Plant>(`/plants/${id}/status`, { 
      status, 
      failure_reason: failureReason,
      failure_date: new Date().toISOString().split('T')[0]
    });
    return data;
  },
};

// Records API
export const recordsAPI = {
  getByPlant: async (plantId: number) => {
    const { data } = await api.get<DailyRecord[]>(`/records/plant/${plantId}`);
    return data;
  },
  
  getById: async (plantId: number, recordId: number) => {
    const { data } = await api.get<DailyRecord>(`/records/${recordId}`);
    return data;
  },
  
  create: async (plantId: number, recordData: Partial<DailyRecord>) => {
    const { data } = await api.post<DailyRecord>(`/records`, { ...recordData, plant_id: plantId });
    return data;
  },
  
  update: async (plantId: number, recordId: number, recordData: Partial<DailyRecord>) => {
    const { data } = await api.put<DailyRecord>(`/records/${recordId}`, recordData);
    return data;
  },
  
  delete: async (plantId: number, recordId: number) => {
    await api.delete(`/records/${recordId}`);
  },

  getAll: async () => {
    const { data } = await api.get<DailyRecord[]>('/records');
    return data;
  },
};

// Statistics API
export const statisticsAPI = {
  get: async () => {
    const { data } = await api.get<Statistics>('/statistics');
    return data;
  },
  
  getPhaseStats: async () => {
    const { data } = await api.get<PhaseStatistics[]>('/statistics/phases');
    return data;
  },

  getGeneticMetrics: async () => {
    const { data } = await api.get<GeneticMetrics[]>('/statistics/genetic-metrics');
    return data;
  },

  getGeneticMetricsById: async (id: number) => {
    const { data } = await api.get<GeneticMetricsDetail>(`/statistics/genetics/${id}`);
    return data;
  },
};

// Phase Statistics Type
export interface PhaseStatistics {
  phase: string;
  total_transitions: number;
  avg_days: number | null;
  min_days: number | null;
  max_days: number | null;
}

// Genetic Metrics Types
export interface GeneticMetrics {
  id: number;
  name: string;
  breeder: string | null;
  type: string | null;
  difficulty: string | null;
  flowering_time_min: number | null;
  flowering_time_max: number | null;
  total_plants: number;
  active_plants: number;
  dead_plants: number;
  germination_failures: number;
  success_rate: number | null;
  germination_rate: number | null;
  evolution: {
    avg_phase_duration: number | null;
    min_phase_duration: number | null;
    max_phase_duration: number | null;
    plants_with_history: number;
  };
  growth: {
    max_height: number | null;
    avg_height: number | null;
  };
  quality_score: number | null;
}

export interface GeneticMetricsDetail {
  genetic: any;
  plants: any[];
  phaseStats: any[];
  timeline: any[];
  summary: {
    total_plants: number;
    active_plants: number;
    dead_plants: number;
    germination_failures: number;
  };
}

// Sensors API
export const sensorsAPI = {
  getAll: async () => {
    const { data } = await api.get<Sensor[]>('/sensors');
    return data;
  },
  
  getById: async (id: number) => {
    const { data } = await api.get<Sensor>(`/sensors/${id}`);
    return data;
  },
  
  create: async (sensorData: Partial<Sensor>) => {
    const { data } = await api.post<Sensor>('/sensors', sensorData);
    return data;
  },
  
  update: async (id: number, sensorData: Partial<Sensor>) => {
    const { data } = await api.put<Sensor>(`/sensors/${id}`, sensorData);
    return data;
  },
  
  delete: async (id: number) => {
    await api.delete(`/sensors/${id}`);
  },
};

// Sensor Readings API
export const readingsAPI = {
  getBySensor: async (sensorId: number, limit = 100) => {
    const { data } = await api.get<SensorReading[]>(`/sensors/${sensorId}/readings?limit=${limit}`);
    return data;
  },
  
  getLatest: async () => {
    const { data} = await api.get<any[]>('/sensor-readings/latest');
    return data;
  },
  
  getDailyAverages: async (days = 7) => {
    const { data } = await api.get<any[]>(`/sensor-readings/daily-averages?days=${days}`);
    return data;
  },
  
  create: async (readingData: Partial<SensorReading>) => {
    const { data } = await api.post<SensorReading>('/sensor-readings', readingData);
    return data;
  },
};

// ===== GENETIC BANK APIs =====

// Genetic Strains API
export const geneticsAPI = {
  getAll: async (activeOnly = false) => {
    const params = activeOnly ? '?active_only=true' : '';
    const { data } = await api.get<GeneticStrain[]>(`/genetics${params}`);
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<GeneticStrain>(`/genetics/${id}`);
    return data;
  },

  create: async (geneticData: Partial<GeneticStrain>) => {
    const { data } = await api.post<GeneticStrain>('/genetics', geneticData);
    return data;
  },

  update: async (id: number, geneticData: Partial<GeneticStrain>) => {
    const { data } = await api.put<GeneticStrain>(`/genetics/${id}`, geneticData);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/genetics/${id}`);
  },
};

// Seed Batches API
export const seedBatchesAPI = {
  getAll: async (options?: { geneticId?: number; activeOnly?: boolean; availableOnly?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.geneticId) params.append('genetic_id', options.geneticId.toString());
    if (options?.activeOnly) params.append('active_only', 'true');
    if (options?.availableOnly) params.append('available_only', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    const { data } = await api.get<SeedBatch[]>(`/seed-batches${query}`);
    return data;
  },

  getByGenetic: async (geneticId: number) => {
    const { data } = await api.get<SeedBatch[]>(`/seed-batches?genetic_id=${geneticId}`);
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<SeedBatch>(`/seed-batches/${id}`);
    return data;
  },

  create: async (batchData: Partial<SeedBatch>) => {
    const { data } = await api.post<SeedBatch>('/seed-batches', batchData);
    return data;
  },

  update: async (id: number, batchData: Partial<SeedBatch>) => {
    const { data } = await api.put<SeedBatch>(`/seed-batches/${id}`, batchData);
    return data;
  },

  updateQuantity: async (id: number, quantity: number, operation: 'set' | 'add' | 'subtract') => {
    const { data } = await api.patch(`/seed-batches/${id}/quantity`, { quantity, operation });
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/seed-batches/${id}`);
  },

  germinate: async (id: number, germinationData: {
    quantity: number;
    substrate: string;
    substrate_other?: string;
    location?: string;
    notes?: string;
  }) => {
    const { data } = await api.post(`/seed-batches/${id}/germinate`, germinationData);
    return data;
  },
};

// Clones API
export const clonesAPI = {
  getAll: async (options?: { motherId?: number; status?: Clone['status'] }) => {
    const params = new URLSearchParams();
    if (options?.motherId) params.append('mother_id', options.motherId.toString());
    if (options?.status) params.append('status', options.status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const { data } = await api.get<Clone[]>(`/clones${query}`);
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<Clone>(`/clones/${id}`);
    return data;
  },

  create: async (cloneData: Partial<Clone>) => {
    const { data } = await api.post<Clone>('/clones', cloneData);
    return data;
  },

  update: async (id: number, cloneData: Partial<Clone>) => {
    const { data } = await api.put<Clone>(`/clones/${id}`, cloneData);
    return data;
  },

  updateStatus: async (id: number, status: Clone['status'], rootingDate?: string) => {
    const { data } = await api.patch<Clone>(`/clones/${id}/status`, { status, rooting_date: rootingDate });
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/clones/${id}`);
  },
};

// Genetic Bank Stats API
export const geneticBankAPI = {
  getStats: async () => {
    const { data } = await api.get<{
      total_genetics: number;
      total_batches: number;
      total_seeds_available: number;
      clones: {
        total: number;
        rooting: number;
        rooted: number;
        planted: number;
      };
      plants_from_seeds: number;
      plants_from_clones: number;
    }>('/genetic-bank/stats');
    return data;
  },
};

export default api;
