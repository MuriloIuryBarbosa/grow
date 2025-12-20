import { useState, useEffect } from 'react';

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

const API_URL = 'http://localhost:3000';

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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export function useGenetics() {
  const [genetics, setGenetics] = useState<Genetic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenetics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAPI<Genetic[]>('/api/genetics?active_only=true');
      setGenetics(data);
    } catch (err) {
      setError('Erro ao carregar genéticas');
      console.error('Erro ao buscar genéticas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenetics();
  }, []);

  return {
    genetics,
    loading,
    error,
    refetch: fetchGenetics,
  };
}