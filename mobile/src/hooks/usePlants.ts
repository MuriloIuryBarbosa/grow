import { useState, useEffect } from 'react';
import { plantsAPI } from '../services/api';
import { Plant } from '../types';

export const usePlants = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlants = async () => {
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
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  return { plants, loading, error, refetch: fetchPlants };
};

export const usePlant = (id: number) => {
  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlant = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await plantsAPI.getById(id);
      setPlant(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar planta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPlant();
    }
  }, [id]);

  return { plant, loading, error, refetch: fetchPlant };
};
