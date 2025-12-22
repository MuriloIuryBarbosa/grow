import { Plant, DailyRecord, Statistics } from '../types';

const API_URL = 'http://localhost:3000';

// Helper function for fetch requests
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
      throw new Error(error.message || 'Erro na requisição');
    }

    return await response.json();
  } catch (err) {
    console.error('Fetch error:', err);
    throw err;
  }
}

// Plants API
export const plantsAPI = {
  getAll: () => fetchAPI<Plant[]>('/api/plants'),
  
  getById: (id: number) => fetchAPI<Plant>(`/api/plants/${id}`),
  
  create: (data: Partial<Plant>) => fetchAPI<Plant>('/api/plants', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: number, data: Partial<Plant>) => fetchAPI<Plant>(`/plants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id: number) => fetchAPI<void>(`/plants/${id}`, {
    method: 'DELETE',
  }),
  
  updatePhase: (id: number, phase: Plant['current_phase']) => 
    fetchAPI<Plant>(`/plants/${id}/phase`, {
      method: 'PUT',
      body: JSON.stringify({ phase }),
    }),
};

// Records API
export const recordsAPI = {
  getByPlant: (plantId: number) => fetchAPI<DailyRecord[]>(`/plants/${plantId}/records`),
  
  getById: (plantId: number, recordId: number) => 
    fetchAPI<DailyRecord>(`/plants/${plantId}/records/${recordId}`),
  
  create: async (plantId: number, data: Partial<DailyRecord> & { photo?: File }) => {
    if (data.photo) {
      const formData = new FormData();
      formData.append('photo', data.photo);
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'photo' && value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      const response = await fetch(`${API_URL}/plants/${plantId}/records`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao criar registro');
      }

      return response.json();
    }

    return fetchAPI<DailyRecord>(`/plants/${plantId}/records`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: async (plantId: number, recordId: number, data: Partial<DailyRecord> & { photo?: File }) => {
    if (data.photo) {
      const formData = new FormData();
      formData.append('photo', data.photo);
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'photo' && value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      const response = await fetch(`${API_URL}/plants/${plantId}/records/${recordId}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar registro');
      }

      return response.json();
    }

    return fetchAPI<DailyRecord>(`/plants/${plantId}/records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  delete: (plantId: number, recordId: number) => 
    fetchAPI<void>(`/plants/${plantId}/records/${recordId}`, {
      method: 'DELETE',
    }),
};

// Statistics API
export const statisticsAPI = {
  get: () => fetchAPI<Statistics>('/api/statistics'),
};

// Sensors API
export const sensorsAPI = {
  getAll: (includeInactive = false) => 
    fetchAPI<any[]>(`/api/sensors?include_inactive=${includeInactive}`),
  
  getById: (id: number) => fetchAPI<any>(`/api/sensors/${id}`),
  
  getLatest: () => fetchAPI<any[]>('/api/sensors/latest'),
  
  create: (data: any) => fetchAPI<any>('/api/sensors', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: number, data: any) => fetchAPI<any>(`/api/sensors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  toggle: (id: number, isActive: boolean) => fetchAPI<any>(`/sensors/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  }),
  
  delete: (id: number) => fetchAPI<void>(`/sensors/${id}`, {
    method: 'DELETE',
  }),
};

// Sensor Readings API
export const readingsAPI = {
  getBySensor: (sensorId: number, limit = 100) => 
    fetchAPI<any[]>(`/api/sensors/${sensorId}/readings?limit=${limit}`),
  
  getLatestBySensor: (sensorId: number) => 
    fetchAPI<any>(`/api/sensors/${sensorId}/readings/latest`),
  
  getStats: (sensorId?: number) => 
    fetchAPI<any>(sensorId ? `/api/sensors/${sensorId}/stats` : '/api/readings/stats'),
  
  getDailyAverages: (startDate: string, endDate: string, sensorId?: number) => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      ...(sensorId && { sensor_id: sensorId.toString() }),
    });
    return fetchAPI<any[]>(`/api/readings/daily?${params}`);
  },
  
  getByRange: (startDate: string, endDate: string, sensorId?: number) => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      ...(sensorId && { sensor_id: sensorId.toString() }),
    });
    return fetchAPI<any[]>(`/readings/range?${params}`);
  },
  
  create: (data: any) => fetchAPI<any>('/api/readings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  createBatch: (readings: any[]) => fetchAPI<any[]>('/api/readings/batch', {
    method: 'POST',
    body: JSON.stringify({ readings }),
  }),
  
  update: (id: number, data: any) => fetchAPI<any>(`/api/readings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id: number) => fetchAPI<void>(`/readings/${id}`, {
    method: 'DELETE',
  }),
};
