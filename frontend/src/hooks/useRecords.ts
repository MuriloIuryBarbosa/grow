import { useState, useEffect, useCallback } from 'react';
import { DailyRecord } from '../types';
import { recordsAPI } from '../services/api';

export function useRecords(plantId: number) {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await recordsAPI.getByPlant(plantId);
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar registros');
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  useEffect(() => {
    if (plantId) {
      fetchRecords();
    }
  }, [plantId, fetchRecords]);

  return { records, loading, error, refetch: fetchRecords };
}
