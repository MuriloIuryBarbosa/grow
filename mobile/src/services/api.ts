import axios from 'axios';
import { Plant, DailyRecord, Statistics, Sensor, SensorReading } from '../types';

// Para desenvolvimento, use o IP da sua máquina (não localhost)
// Exemplo: 'http://192.168.1.100:3000'
// Para rodar no Android Emulator, use: 'http://10.0.2.2:3000'
const API_URL = 'http://10.0.2.2:3000';

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
};

// Records API
export const recordsAPI = {
  getByPlant: async (plantId: number) => {
    const { data } = await api.get<DailyRecord[]>(`/plants/${plantId}/records`);
    return data;
  },
  
  getById: async (plantId: number, recordId: number) => {
    const { data } = await api.get<DailyRecord>(`/plants/${plantId}/records/${recordId}`);
    return data;
  },
  
  create: async (plantId: number, recordData: Partial<DailyRecord>) => {
    const { data } = await api.post<DailyRecord>(`/plants/${plantId}/records`, recordData);
    return data;
  },
  
  update: async (plantId: number, recordId: number, recordData: Partial<DailyRecord>) => {
    const { data } = await api.put<DailyRecord>(`/plants/${plantId}/records/${recordId}`, recordData);
    return data;
  },
  
  delete: async (plantId: number, recordId: number) => {
    await api.delete(`/plants/${plantId}/records/${recordId}`);
  },
};

// Statistics API
export const statisticsAPI = {
  get: async () => {
    const { data } = await api.get<Statistics>('/statistics');
    return data;
  },
};

// Sensors API
export const sensorsAPI = {
  getAll: async (includeInactive = false) => {
    const { data } = await api.get<Sensor[]>(`/sensors?include_inactive=${includeInactive}`);
    return data;
  },
  
  getById: async (id: number) => {
    const { data } = await api.get<Sensor>(`/sensors/${id}`);
    return data;
  },
  
  getLatest: async () => {
    const { data } = await api.get<any[]>('/sensors/latest');
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
  
  toggle: async (id: number, isActive: boolean) => {
    const { data } = await api.patch<Sensor>(`/sensors/${id}/toggle`, { is_active: isActive });
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
  
  getLatestBySensor: async (sensorId: number) => {
    const { data } = await api.get<SensorReading>(`/sensors/${sensorId}/readings/latest`);
    return data;
  },
  
  getStats: async (sensorId?: number) => {
    const endpoint = sensorId ? `/sensors/${sensorId}/stats` : '/readings/stats';
    const { data } = await api.get<any>(endpoint);
    return data;
  },
  
  getDailyAverages: async (startDate: string, endDate: string, sensorId?: number) => {
    const params: any = { start_date: startDate, end_date: endDate };
    if (sensorId) params.sensor_id = sensorId;
    const { data } = await api.get<any[]>('/readings/daily', { params });
    return data;
  },
  
  getByRange: async (startDate: string, endDate: string, sensorId?: number) => {
    const params: any = { start_date: startDate, end_date: endDate };
    if (sensorId) params.sensor_id = sensorId;
    const { data } = await api.get<any[]>('/readings/range', { params });
    return data;
  },
  
  create: async (readingData: Partial<SensorReading>) => {
    const { data } = await api.post<SensorReading>('/readings', readingData);
    return data;
  },
  
  createBatch: async (readings: Partial<SensorReading>[]) => {
    const { data } = await api.post<SensorReading[]>('/readings/batch', { readings });
    return data;
  },
  
  update: async (id: number, readingData: Partial<SensorReading>) => {
    const { data } = await api.put<SensorReading>(`/readings/${id}`, readingData);
    return data;
  },
  
  delete: async (id: number) => {
    await api.delete(`/readings/${id}`);
  },
};

export default api;
