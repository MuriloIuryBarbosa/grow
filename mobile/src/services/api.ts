import axios from 'axios';
import { Plant, DailyRecord, Statistics, Sensor, SensorReading } from '../types';

// Para desenvolvimento, use o IP da sua máquina (não localhost)
// iOS: Use o IP da rede local
// Android Emulator: Use 'http://10.0.2.2:3000'
const API_URL = 'http://192.168.1.6:3000/api';

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
};

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

export default api;
