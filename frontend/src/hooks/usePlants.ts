import { useState, useEffect, useCallback } from 'react';
import { Plant } from '../types';
import { plantsAPI } from '../services/api';

export function usePlants() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await plantsAPI.getAll();
      setPlants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar plantas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlants();
  }, [fetchPlants]);

  return { plants, loading, error, refetch: fetchPlants };
}

export function usePlant(id: number) {
  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlant = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await plantsAPI.getById(id);
      setPlant(data);
    } catch (err) {
      console.error('Error loading plant:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar planta');
      setPlant(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPlant();
  }, [fetchPlant]);

  return { plant, loading, error, refetch: fetchPlant };
}
