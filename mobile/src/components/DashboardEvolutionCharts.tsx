import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native';
import Svg, { Line, Circle, G, Text as SvgText, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { format, differenceInDays } from 'date-fns';
import { parseDate } from '../utils/date.utils';
import { Plant, DailyRecord } from '../types';
import { recordsAPI } from '../services/api';

interface DashboardEvolutionChartsProps {
  plants: Plant[];
  onPlantPress?: (plantId: number) => void;
}

interface AggregatedDataPoint {
  day: number;
  date: string;
  avgSize: number | null;
  avgLeaves: number | null;
  avgBranches: number | null;
  evolutionScore: number;
  plantCount: number;
}

const MINI_CHART_HEIGHT = 120;

const COLORS = {
  size: '#4CAF50',
  leaves: '#2196F3',
  branches: '#FF9800',
  evolution: '#9C27B0',
};

export default function DashboardEvolutionCharts({ plants, onPlantPress }: DashboardEvolutionChartsProps) {
  const [allRecords, setAllRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlantId, setSelectedPlantId] = useState<number | null>(null);
  const [showPlantPicker, setShowPlantPicker] = useState(false);

  const activePlants = plants.filter(p => p.status === 'ativa');

  useEffect(() => {
    loadAllRecords();
  }, [plants]);

  const loadAllRecords = async () => {
    try {
      setLoading(true);
      const records = await recordsAPI.getAll();
      setAllRecords(records);
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar plantas para exibição
  const filteredPlants = selectedPlantId 
    ? activePlants.filter(p => p.id === selectedPlantId)
    : activePlants;

  const selectedPlant = selectedPlantId 
    ? activePlants.find(p => p.id === selectedPlantId) 
    : null;

  // Agregar dados por dia (média de todas as plantas ou planta específica)
  const aggregatedData = useMemo(() => {
    if (filteredPlants.length === 0 || allRecords.length === 0) return [];

    // Agrupar registros por dia relativo à germinação de cada planta
    const dayDataMap = new Map<number, {
      sizes: number[];
      leaves: number[];
      branches: number[];
      dates: string[];
    }>();

    filteredPlants.forEach(plant => {
      if (!plant.germination_date) return;
      
      const germinationDate = parseDate(plant.germination_date);
      const plantRecords = allRecords.filter(r => r.plant_id === plant.id);

      plantRecords.forEach(record => {
        const recordDate = parseDate(record.record_date);
        const day = differenceInDays(recordDate, germinationDate);
        
        if (day < 0) return; // Ignorar registros antes da germinação

        if (!dayDataMap.has(day)) {
          dayDataMap.set(day, { sizes: [], leaves: [], branches: [], dates: [] });
        }

        const dayData = dayDataMap.get(day)!;
        
        if (record.plant_size !== null && record.plant_size !== undefined) {
          dayData.sizes.push(record.plant_size);
        }
        if (record.leaf_count !== null && record.leaf_count !== undefined) {
          dayData.leaves.push(record.leaf_count);
        }
        if (record.branch_count !== null && record.branch_count !== undefined) {
          dayData.branches.push(record.branch_count);
        }
        dayData.dates.push(format(recordDate, 'dd/MM'));
      });
    });

    // Converter para array e calcular médias
    const sortedDays = Array.from(dayDataMap.keys()).sort((a, b) => a - b);
    
    // Pegar apenas os últimos 30 dias para não sobrecarregar o gráfico
    const recentDays = sortedDays.slice(-30);

    return recentDays.map(day => {
      const data = dayDataMap.get(day)!;
      
      const avgSize = data.sizes.length > 0 
        ? Math.round(data.sizes.reduce((a, b) => a + b, 0) / data.sizes.length * 10) / 10
        : null;
      const avgLeaves = data.leaves.length > 0 
        ? Math.round(data.leaves.reduce((a, b) => a + b, 0) / data.leaves.length * 10) / 10
        : null;
      const avgBranches = data.branches.length > 0 
        ? Math.round(data.branches.reduce((a, b) => a + b, 0) / data.branches.length * 10) / 10
        : null;

      return {
        day,
        date: data.dates[0] || `D${day}`,
        avgSize,
        avgLeaves,
        avgBranches,
        evolutionScore: 0,
        plantCount: Math.max(data.sizes.length, data.leaves.length, data.branches.length),
      };
    });
  }, [filteredPlants, allRecords]);

  // Calcular max values
  const maxValues = useMemo(() => {
    const sizes = aggregatedData.filter(d => d.avgSize !== null).map(d => d.avgSize as number);
    const leaves = aggregatedData.filter(d => d.avgLeaves !== null).map(d => d.avgLeaves as number);
    const branches = aggregatedData.filter(d => d.avgBranches !== null).map(d => d.avgBranches as number);

    return {
      size: sizes.length > 0 ? Math.max(...sizes) * 1.1 : 0,
      leaves: leaves.length > 0 ? Math.max(...leaves) * 1.1 : 0,
      branches: branches.length > 0 ? Math.max(...branches) * 1.1 : 0,
    };
  }, [aggregatedData]);

  // Motor de Cálculo de Evolução Geral (média de todas as plantas)
  const evolutionData = useMemo(() => {
    if (aggregatedData.length === 0) return [];

    const maxSize = Math.max(...aggregatedData.filter(d => d.avgSize !== null).map(d => d.avgSize as number), 1);
    const maxLeaves = Math.max(...aggregatedData.filter(d => d.avgLeaves !== null).map(d => d.avgLeaves as number), 1);
    const maxBranches = Math.max(...aggregatedData.filter(d => d.avgBranches !== null).map(d => d.avgBranches as number), 1);

    const WEIGHT_SIZE = 0.40;
    const WEIGHT_LEAVES = 0.35;
    const WEIGHT_BRANCHES = 0.25;

    return aggregatedData.map(point => {
      const normalizedSize = point.avgSize !== null ? (point.avgSize / maxSize) * 100 : null;
      const normalizedLeaves = point.avgLeaves !== null ? (point.avgLeaves / maxLeaves) * 100 : null;
      const normalizedBranches = point.avgBranches !== null ? (point.avgBranches / maxBranches) * 100 : null;

      let totalWeight = 0;
      let weightedSum = 0;

      if (normalizedSize !== null) {
        weightedSum += normalizedSize * WEIGHT_SIZE;
        totalWeight += WEIGHT_SIZE;
      }
      if (normalizedLeaves !== null) {
        weightedSum += normalizedLeaves * WEIGHT_LEAVES;
        totalWeight += WEIGHT_LEAVES;
      }
      if (normalizedBranches !== null) {
        weightedSum += normalizedBranches * WEIGHT_BRANCHES;
        totalWeight += WEIGHT_BRANCHES;
      }

      const evolutionScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;

      return {
        ...point,
        evolutionScore,
      };
    });
  }, [aggregatedData]);

  const maxEvolution = useMemo(() => {
    const scores = evolutionData.filter(d => d.evolutionScore > 0).map(d => d.evolutionScore);
    return scores.length > 0 ? Math.max(...scores) * 1.1 : 100;
  }, [evolutionData]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📊 Evolução Geral</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      </View>
    );
  }

  if (aggregatedData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📊 Evolução Geral</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Sem dados de evolução</Text>
          <Text style={styles.emptySubtext}>Adicione registros às suas plantas</Text>
        </View>
      </View>
    );
  }

  const lastEvolution = evolutionData[evolutionData.length - 1];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>📊 Evolução Geral</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowPlantPicker(true)}
        >
          <Text style={styles.filterButtonText}>
            {selectedPlant ? `🌱 ${selectedPlant.name}` : '🌱 Todas'}
          </Text>
          <Text style={styles.filterIcon}>▼</Text>
        </TouchableOpacity>
      </View>

      {selectedPlant && (
        <TouchableOpacity 
          style={styles.clearFilterButton}
          onPress={() => setSelectedPlantId(null)}
        >
          <Text style={styles.clearFilterText}>✕ Limpar filtro</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.subtitle}>
        {selectedPlant 
          ? `Dados de ${selectedPlant.name} (${selectedPlant.code})`
          : `Média de ${activePlants.length} plantas ativas`
        }
      </Text>

      {/* Gráfico de Tamanho */}
      {maxValues.size > 0 && (
        <MiniChart
          title="📏 Tamanho Médio (cm)"
          data={aggregatedData}
          valueKey="avgSize"
          maxValue={maxValues.size}
          color={COLORS.size}
          unit="cm"
        />
      )}

      {/* Gráfico de Folhas */}
      {maxValues.leaves > 0 && (
        <MiniChart
          title="🌿 Média de Folhas"
          data={aggregatedData}
          valueKey="avgLeaves"
          maxValue={maxValues.leaves}
          color={COLORS.leaves}
          unit=""
        />
      )}

      {/* Gráfico de Ramos */}
      {maxValues.branches > 0 && (
        <MiniChart
          title="🌳 Média de Ramos"
          data={aggregatedData}
          valueKey="avgBranches"
          maxValue={maxValues.branches}
          color={COLORS.branches}
          unit=""
        />
      )}

      {/* Gráfico de Evolução Geral */}
      {evolutionData.length > 0 && evolutionData.some(d => d.evolutionScore > 0) && (
        <View style={styles.evolutionChartContainer}>
          <View style={styles.evolutionHeader}>
            <Text style={styles.miniChartTitle}>🚀 Score de Evolução</Text>
            <View style={styles.evolutionBadge}>
              <Text style={styles.evolutionBadgeText}>
                {lastEvolution?.evolutionScore?.toFixed(1) || 0}%
              </Text>
            </View>
          </View>
          <Text style={styles.evolutionDescription}>
            Tamanho (40%) + Folhas (35%) + Ramos (25%)
          </Text>
          <MiniChart
            title=""
            data={evolutionData}
            valueKey="evolutionScore"
            maxValue={maxEvolution}
            color={COLORS.evolution}
            unit="%"
            showGradient
          />
        </View>
      )}

      {/* Modal de seleção de planta */}
      <Modal
        visible={showPlantPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlantPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Planta</Text>
              <TouchableOpacity onPress={() => setShowPlantPicker(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.plantOption, !selectedPlantId && styles.plantOptionSelected]}
              onPress={() => {
                setSelectedPlantId(null);
                setShowPlantPicker(false);
              }}
            >
              <Text style={styles.plantOptionEmoji}>🌱</Text>
              <View style={styles.plantOptionInfo}>
                <Text style={styles.plantOptionName}>Todas as Plantas</Text>
                <Text style={styles.plantOptionCode}>Média geral de {activePlants.length} plantas</Text>
              </View>
            </TouchableOpacity>

            <FlatList
              data={activePlants}
              keyExtractor={(item) => item.id!.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.plantOption, selectedPlantId === item.id && styles.plantOptionSelected]}
                  onPress={() => {
                    setSelectedPlantId(item.id!);
                    setShowPlantPicker(false);
                  }}
                >
                  <Text style={styles.plantOptionEmoji}>🌿</Text>
                  <View style={styles.plantOptionInfo}>
                    <Text style={styles.plantOptionName}>{item.name}</Text>
                    <Text style={styles.plantOptionCode}>{item.code}</Text>
                  </View>
                </TouchableOpacity>
              )}
              style={styles.plantList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Componente de Mini Gráfico
interface MiniChartProps {
  title: string;
  data: AggregatedDataPoint[];
  valueKey: 'avgSize' | 'avgLeaves' | 'avgBranches' | 'evolutionScore';
  maxValue: number;
  color: string;
  unit: string;
  showGradient?: boolean;
}

function MiniChart({ title, data, valueKey, maxValue, color, unit, showGradient }: MiniChartProps) {
  const filteredData = data.filter(d => d[valueKey] !== null && d[valueKey] !== undefined);
  
  if (filteredData.length === 0) return null;

  const chartWidth = Math.max(filteredData.length * 40 + 50, 280);
  const svgHeight = MINI_CHART_HEIGHT + 30;

  const getY = (value: number | null): number => {
    if (value === null || maxValue === 0) return svgHeight - 20;
    const ratio = value / maxValue;
    return 10 + MINI_CHART_HEIGHT * (1 - ratio);
  };

  const getX = (index: number): number => {
    return 30 + index * 40;
  };

  // Criar path para área preenchida
  const areaPath = useMemo(() => {
    if (!showGradient || filteredData.length < 2) return '';

    let path = `M ${getX(0)} ${svgHeight - 20}`;
    filteredData.forEach((point, index) => {
      const y = getY(point[valueKey] as number);
      path += ` L ${getX(index)} ${y}`;
    });
    path += ` L ${getX(filteredData.length - 1)} ${svgHeight - 20} Z`;
    return path;
  }, [filteredData, showGradient]);

  const lastValue = filteredData[filteredData.length - 1]?.[valueKey];
  const firstValue = filteredData[0]?.[valueKey];
  const growth = lastValue && firstValue && firstValue !== 0
    ? (((lastValue as number) - (firstValue as number)) / (firstValue as number) * 100).toFixed(0)
    : null;

  return (
    <View style={styles.miniChartContainer}>
      {title !== '' && (
        <View style={styles.miniChartHeader}>
          <Text style={styles.miniChartTitle}>{title}</Text>
          <View style={styles.miniChartStats}>
            <Text style={[styles.miniChartValue, { color }]}>
              {typeof lastValue === 'number' ? lastValue.toFixed(1) : lastValue}{unit}
            </Text>
            {growth !== null && Number(growth) !== 0 && (
              <Text style={[styles.miniChartGrowth, { color: Number(growth) > 0 ? '#4CAF50' : '#f44336' }]}>
                {Number(growth) > 0 ? '↑' : '↓'} {Math.abs(Number(growth))}%
              </Text>
            )}
          </View>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={chartWidth} height={svgHeight}>
          {showGradient && (
            <Defs>
              <LinearGradient id="areaGradientDash" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.05" />
              </LinearGradient>
            </Defs>
          )}

          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio, i) => (
            <Line
              key={`mini-grid-${i}`}
              x1={25}
              y1={10 + MINI_CHART_HEIGHT * (1 - ratio)}
              x2={chartWidth - 10}
              y2={10 + MINI_CHART_HEIGHT * (1 - ratio)}
              stroke="#e8e8e8"
              strokeWidth={1}
            />
          ))}

          {/* Área preenchida */}
          {showGradient && areaPath && (
            <Path d={areaPath} fill="url(#areaGradientDash)" />
          )}

          {/* Linha do gráfico */}
          {filteredData.length > 1 && filteredData.map((point, i) => {
            if (i === 0) return null;
            const prevPoint = filteredData[i - 1];
            return (
              <Line
                key={`mini-line-${i}`}
                x1={getX(i - 1)}
                y1={getY(prevPoint[valueKey] as number)}
                x2={getX(i)}
                y2={getY(point[valueKey] as number)}
                stroke={color}
                strokeWidth={2.5}
              />
            );
          })}

          {/* Pontos */}
          {filteredData.map((point, index) => (
            <Circle
              key={`mini-point-${index}`}
              cx={getX(index)}
              cy={getY(point[valueKey] as number)}
              r={4}
              fill={color}
            />
          ))}

          {/* Labels */}
          {filteredData.map((point, index) => (
            <SvgText
              key={`mini-label-${index}`}
              x={getX(index)}
              y={svgHeight - 5}
              fontSize={8}
              fill="#999"
              textAnchor="middle"
            >
              D{point.day}
            </SvgText>
          ))}
        </Svg>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  filterButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  filterIcon: {
    fontSize: 10,
    color: '#666',
  },
  clearFilterButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#ffebee',
    borderRadius: 12,
  },
  clearFilterText: {
    fontSize: 11,
    color: '#e53935',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  miniChartContainer: {
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  miniChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniChartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  miniChartStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniChartValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  miniChartGrowth: {
    fontSize: 12,
    fontWeight: '600',
  },
  evolutionChartContainer: {
    backgroundColor: '#f5f0ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0d4f5',
  },
  evolutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  evolutionBadge: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  evolutionBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  evolutionDescription: {
    fontSize: 11,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseText: {
    fontSize: 20,
    color: '#999',
    padding: 4,
  },
  plantList: {
    maxHeight: 400,
  },
  plantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  plantOptionSelected: {
    backgroundColor: '#e8f5e9',
  },
  plantOptionEmoji: {
    fontSize: 24,
  },
  plantOptionInfo: {
    flex: 1,
  },
  plantOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  plantOptionCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
