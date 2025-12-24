import { useState, useEffect } from 'react';
import { recordsAPI } from '../services/api';
import { DailyRecord } from '../types';

export const useRecords = (plantId: number) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await recordsAPI.getByPlant(plantId);
      // Ordenar por data mais recente primeiro
      const sorted = data.sort((a, b) => 
        new Date(b.record_date).getTime() - new Date(a.record_date).getTime()
      );
      setRecords(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar registros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (plantId) {
      fetchRecords();
    }
  }, [plantId]);

  return { records, loading, error, refetch: fetchRecords };
};
