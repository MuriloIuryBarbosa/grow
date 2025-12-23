import React, { useState, useEffect, useMemo } from 'react';
import { Plant, DailyRecord, PlantPhase, PlantStatus } from '../types';
import { plantsAPI, recordsAPI } from '../services/api';
import { format, parseISO, differenceInDays } from 'date-fns';

interface ReportFilters {
  code?: string;
  genetic?: string;
  status?: PlantStatus;
  phase?: PlantPhase;
  startDate?: Date;
  endDate?: Date;
  minSize?: number;
  maxSize?: number;
}

interface PlantReport {
  plant: Plant;
  records: DailyRecord[];
  growthRate: number; // cm/dia
  totalGrowth: number; // cm total
  avgTemperature?: number;
  avgHumidity?: number;
  photoRecords: DailyRecord[];
  insights: string[];
}

export default function Report() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [selectedPlant, setSelectedPlant] = useState<PlantReport | null>(null);

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    try {
      setLoading(true);
      const plantsData = await plantsAPI.getAll();
      setPlants(plantsData);
    } catch (err) {
      setError('Erro ao carregar plantas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlants = useMemo(() => {
    return plants.filter(plant => {
      if (filters.code && !plant.code.toLowerCase().includes(filters.code.toLowerCase())) return false;
      if (filters.genetic && !plant.genetic?.toLowerCase().includes(filters.genetic.toLowerCase())) return false;
      if (filters.status && plant.status !== filters.status) return false;
      if (filters.phase && plant.current_phase !== filters.phase) return false;
      return true;
    });
  }, [plants, filters]);

  const generateReport = async (plant: Plant): Promise<PlantReport> => {
    try {
      // Usar a nova API filtrada para buscar registros
      const apiFilters: any = {
        plantIds: [plant.id!]
      };

      if (filters.startDate) {
        apiFilters.startDate = format(filters.startDate, 'yyyy-MM-dd');
      }
      if (filters.endDate) {
        apiFilters.endDate = format(filters.endDate, 'yyyy-MM-dd');
      }
      if (filters.minSize !== undefined) {
        apiFilters.minSize = filters.minSize;
      }
      if (filters.maxSize !== undefined) {
        apiFilters.maxSize = filters.maxSize;
      }

      const allRecords = await recordsAPI.getFiltered(apiFilters);
      const records = allRecords.filter(r => r.plant_id === plant.id!);

      // Filtrar registros por tamanho adicional se necessário
      let filteredRecords = records;
      if (filters.minSize !== undefined || filters.maxSize !== undefined) {
        filteredRecords = records.filter(record => {
          if (filters.minSize !== undefined && record.plant_size !== undefined && record.plant_size < filters.minSize) return false;
          if (filters.maxSize !== undefined && record.plant_size !== undefined && record.plant_size > filters.maxSize) return false;
          return true;
        });
      }

      // Calcular crescimento
      const sizeRecords = filteredRecords
        .filter(r => r.plant_size !== undefined && r.plant_size !== null)
        .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());

      let growthRate = 0;
      let totalGrowth = 0;

      if (sizeRecords.length >= 2) {
        const firstSize = sizeRecords[0].plant_size!;
        const lastSize = sizeRecords[sizeRecords.length - 1].plant_size!;
        totalGrowth = lastSize - firstSize;

        const days = differenceInDays(
          parseISO(sizeRecords[sizeRecords.length - 1].record_date),
          parseISO(sizeRecords[0].record_date)
        );
        growthRate = days > 0 ? totalGrowth / days : 0;
      }

      // Calcular médias
      const tempRecords = filteredRecords.filter(r => r.temperature !== undefined);
      const humidityRecords = filteredRecords.filter(r => r.humidity !== undefined);

      const avgTemperature = tempRecords.length > 0
        ? tempRecords.reduce((sum, r) => sum + r.temperature!, 0) / tempRecords.length
        : undefined;

      const avgHumidity = humidityRecords.length > 0
        ? humidityRecords.reduce((sum, r) => sum + r.humidity!, 0) / humidityRecords.length
        : undefined;

      // Registros com fotos
      const photoRecords = filteredRecords.filter(r => r.photo_path);

      // Gerar insights
      const insights: string[] = [];

      if (growthRate > 0) {
        insights.push(`Crescimento médio: +${growthRate.toFixed(2)} cm/dia`);
      }

      if (totalGrowth > 0) {
        insights.push(`Crescimento total: +${totalGrowth.toFixed(1)} cm`);
      }

      if (avgTemperature !== undefined) {
        insights.push(`Temperatura média: ${avgTemperature.toFixed(1)}°C`);
      }

      if (avgHumidity !== undefined) {
        insights.push(`Umidade média: ${avgHumidity.toFixed(1)}%`);
      }

      if (photoRecords.length > 0) {
        insights.push(`${photoRecords.length} registros com fotos`);
      }

      return {
        plant,
        records: filteredRecords,
        growthRate,
        totalGrowth,
        avgTemperature,
        avgHumidity,
        photoRecords,
        insights
      };
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      return {
        plant,
        records: [],
        growthRate: 0,
        totalGrowth: 0,
        photoRecords: [],
        insights: ['Erro ao carregar dados']
      };
    }
  };

  const handlePlantSelect = async (plant: Plant) => {
    const report = await generateReport(plant);
    setSelectedPlant(report);
  };

  const clearFilters = () => {
    setFilters({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando relatório...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadPlants}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatório de Plantas</h1>
          <p className="text-gray-600">Análise detalhada do crescimento e desenvolvimento das plantas</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código do Vaso
              </label>
              <input
                type="text"
                value={filters.code || ''}
                onChange={(e) => setFilters({...filters, code: e.target.value || undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Ex: V001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Genética
              </label>
              <input
                type="text"
                value={filters.genetic || ''}
                onChange={(e) => setFilters({...filters, genetic: e.target.value || undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Ex: Northern Lights"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({...filters, status: e.target.value as PlantStatus || undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos</option>
                <option value="ativa">Ativa</option>
                <option value="morta">Morta</option>
                <option value="colhida">Colhida</option>
                <option value="falha_germinacao">Falha Germinação</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fase Atual
              </label>
              <select
                value={filters.phase || ''}
                onChange={(e) => setFilters({...filters, phase: e.target.value as PlantPhase || undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todas</option>
                <option value="germinacao">Germinação</option>
                <option value="muda">Muda</option>
                <option value="vegetacao">Vegetação</option>
                <option value="floracao">Floração</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFilters({...filters, startDate: e.target.value ? parseISO(e.target.value) : undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFilters({...filters, endDate: e.target.value ? parseISO(e.target.value) : undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tamanho Mínimo (cm)
              </label>
              <input
                type="number"
                value={filters.minSize || ''}
                onChange={(e) => setFilters({...filters, minSize: e.target.value ? Number(e.target.value) : undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tamanho Máximo (cm)
              </label>
              <input
                type="number"
                value={filters.maxSize || ''}
                onChange={(e) => setFilters({...filters, maxSize: e.target.value ? Number(e.target.value) : undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="200"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Lista de Plantas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">
              Plantas ({filteredPlants.length})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredPlants.map(plant => (
                <div
                  key={plant.id}
                  onClick={() => handlePlantSelect(plant)}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedPlant?.plant.id === plant.id ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{plant.name}</h3>
                      <p className="text-sm text-gray-600">Código: {plant.code}</p>
                      <p className="text-sm text-gray-600">Genética: {plant.genetic || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        plant.status === 'ativa' ? 'bg-green-100 text-green-800' :
                        plant.status === 'morta' ? 'bg-red-100 text-red-800' :
                        plant.status === 'colhida' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {plant.status}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">{plant.current_phase}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Relatório Detalhado */}
          {selectedPlant && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                Relatório: {selectedPlant.plant.name}
              </h2>

              {/* Insights */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Insights</h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedPlant.insights.map((insight, index) => (
                    <div key={index} className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fotos dos Registros */}
              {selectedPlant.photoRecords.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">
                    Registros com Fotos ({selectedPlant.photoRecords.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedPlant.photoRecords.map(record => (
                      <div key={record.id} className="border rounded-lg p-2">
                        <img
                          src={`http://localhost:3000${record.photo_path}`}
                          alt={`Registro ${format(parseISO(record.record_date), 'dd/MM/yyyy')}`}
                          className="w-full h-32 object-cover rounded"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          {format(parseISO(record.record_date), 'dd/MM/yyyy')}
                        </p>
                        {record.plant_size && (
                          <p className="text-xs text-gray-600">
                            Tamanho: {record.plant_size}cm
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gráfico de Crescimento */}
              {selectedPlant.records.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Evolução do Tamanho</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      {selectedPlant.records
                        .filter(r => r.plant_size)
                        .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime())
                        .map(record => (
                        <div key={record.id} className="flex items-center gap-4">
                          <span className="text-sm text-gray-600 w-20">
                            {format(parseISO(record.record_date), 'dd/MM')}
                          </span>
                          <div className="flex-1 bg-gray-200 rounded-full h-4">
                            <div
                              className="bg-green-500 h-4 rounded-full"
                              style={{ width: `${Math.min((record.plant_size! / 200) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-12">
                            {record.plant_size}cm
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}