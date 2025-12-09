import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { format, differenceInDays, addDays } from 'date-fns';
import { parseDate } from '../utils/date.utils';
import { DailyRecord, Plant } from '../types';

interface GrowthChartProps {
  records: DailyRecord[];
  plant: Plant;
}

interface DataPoint {
  day: number;
  date: Date;
  formattedDate: string;
  plant_size?: number;
  leaf_count?: number;
  branch_count?: number;
}

interface PhaseMarker {
  day: number;
  phase: string;
  label: string;
  color: string;
}

export default function GrowthChart({ records, plant }: GrowthChartProps) {
  const sortedRecords = useMemo(() => 
    [...records].sort((a, b) => 
      parseDate(a.record_date).getTime() - parseDate(b.record_date).getTime()
    ),
    [records]
  );

  // Calcular dados desde a germinação
  const chartData = useMemo(() => {
    if (sortedRecords.length === 0 || !plant.germination_date) return [];

    const germinationDate = parseDate(plant.germination_date);
    const lastRecordDate = parseDate(sortedRecords[sortedRecords.length - 1].record_date);
    const totalDays = differenceInDays(lastRecordDate, germinationDate);

    const data: DataPoint[] = [];
    let lastValues = {
      plant_size: undefined as number | undefined,
      leaf_count: undefined as number | undefined,
      branch_count: undefined as number | undefined,
    };

    for (let day = 0; day <= totalDays; day++) {
      const currentDate = addDays(germinationDate, day);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      const dayData = sortedRecords.find(r => r.record_date.split('T')[0] === dateStr);
      
      if (dayData) {
        if (dayData.plant_size !== undefined) lastValues.plant_size = dayData.plant_size;
        if (dayData.leaf_count !== undefined) lastValues.leaf_count = dayData.leaf_count;
        if (dayData.branch_count !== undefined) lastValues.branch_count = dayData.branch_count;
      }

      data.push({
        day,
        date: currentDate,
        formattedDate: format(currentDate, 'dd/MM'),
        ...lastValues
      });
    }

    return data;
  }, [sortedRecords, plant.germination_date]);

  // Calcular marcadores de fase
  const phaseMarkers = useMemo(() => {
    if (!plant.germination_date) return [];
    
    const markers: PhaseMarker[] = [];
    const germinationDate = parseDate(plant.germination_date);
    const today = new Date();
    
    const getPhaseColor = (phase: string) => {
      switch(phase) {
        case 'germinacao': return '#86efac';
        case 'muda': return '#4ade80';
        case 'vegetacao': return '#22c55e';
        case 'floracao': return '#ec4899';
        default: return '#4CAF50';
      }
    };
    
    // Marcador de germinação
    const germinationHistory = plant.phase_history?.find(h => h.phase === 'germinacao');
    let germinationDays = 0;
    if (germinationHistory) {
      germinationDays = germinationHistory.duration_days || 0;
      if (!germinationHistory.ended_at) {
        germinationDays = differenceInDays(today, parseDate(germinationHistory.started_at));
      }
    }
    
    markers.push({
      day: 0,
      phase: 'germinacao',
      label: `🌱 Germinação (${germinationDays}d)`,
      color: getPhaseColor('germinacao')
    });

    // Adicionar marcadores baseados no histórico de fases
    if (plant.phase_history && plant.phase_history.length > 0) {
      plant.phase_history.forEach(history => {
        const phaseStartDate = parseDate(history.started_at);
        const daysSinceGermination = differenceInDays(phaseStartDate, germinationDate);
        
        if (history.phase !== 'germinacao' && daysSinceGermination >= 0) {
          let phaseDuration = history.duration_days || 0;
          if (!history.ended_at) {
            phaseDuration = differenceInDays(today, phaseStartDate);
          }
          
          let label = '';
          switch(history.phase) {
            case 'muda':
              label = `🌿 Muda (${phaseDuration}d)`;
              break;
            case 'vegetacao':
              label = `🌱 Vegetação (${phaseDuration}d)`;
              break;
            case 'floracao':
              label = `🌸 Floração (${phaseDuration}d)`;
              break;
          }
          
          markers.push({
            day: daysSinceGermination,
            phase: history.phase,
            label,
            color: getPhaseColor(history.phase)
          });
        }
      });
    }
    
    return markers.sort((a, b) => a.day - b.day);
  }, [plant.germination_date, plant.phase_history]);

  const hasPlantData = useMemo(() => 
    chartData.some(d => d.plant_size),
    [chartData]
  );

  if (!hasPlantData || chartData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>📊 Sem dados suficientes para gerar gráfico</Text>
      </View>
    );
  }

  const maxDay = Math.max(...chartData.map(d => d.day));
  const dataWithSize = chartData.filter(d => d.plant_size !== undefined);
  const dataWithLeaves = chartData.filter(d => d.leaf_count !== undefined);
  const dataWithBranches = chartData.filter(d => d.branch_count !== undefined);
  
  const maxSize = dataWithSize.length > 0 ? Math.max(...dataWithSize.map(d => d.plant_size!)) : 0;
  const maxLeaves = dataWithLeaves.length > 0 ? Math.max(...dataWithLeaves.map(d => d.leaf_count!)) : 0;
  const maxBranches = dataWithBranches.length > 0 ? Math.max(...dataWithBranches.map(d => d.branch_count!)) : 0;

  const CHART_WIDTH = 800;
  const CHART_HEIGHT = 300;

  // Selecionar 5 datas para exibir no eixo X
  const xAxisDates = useMemo(() => {
    if (chartData.length === 0) return [];
    const step = Math.floor(chartData.length / 4);
    return [
      chartData[0],
      chartData[Math.min(step, chartData.length - 1)],
      chartData[Math.min(step * 2, chartData.length - 1)],
      chartData[Math.min(step * 3, chartData.length - 1)],
      chartData[chartData.length - 1],
    ];
  }, [chartData]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📈 Evolução da Planta</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={styles.chartWrapper}>
          {/* Fundo das fases */}
          <View style={styles.phasesContainer}>
            {phaseMarkers.map((marker, index) => {
              const nextMarker = phaseMarkers[index + 1];
              const startPercent = (marker.day / maxDay) * 100;
              const endPercent = nextMarker ? (nextMarker.day / maxDay) * 100 : 100;
              const widthPercent = endPercent - startPercent;
              
              return (
                <View
                  key={index}
                  style={[
                    styles.phaseBar,
                    {
                      left: `${startPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: marker.color,
                    }
                  ]}
                />
              );
            })}
          </View>

          {/* Gráfico com barras verticais para cada métrica */}
          <View style={styles.barsContainer}>
            {/* Barras de tamanho */}
            {dataWithSize.map((point, index) => {
              const heightPercent = maxSize > 0 ? (point.plant_size! / maxSize) * 90 : 0;
              const leftPercent = (point.day / maxDay) * 100;
              
              return (
                <View
                  key={`size-bar-${index}`}
                  style={[
                    styles.bar,
                    {
                      height: `${heightPercent}%`,
                      left: `${leftPercent}%`,
                      backgroundColor: '#4CAF50',
                      width: 6,
                    }
                  ]}
                >
                  <View style={[styles.barDot, { backgroundColor: '#4CAF50' }]} />
                </View>
              );
            })}

            {/* Barras de folhas */}
            {dataWithLeaves.map((point, index) => {
              const heightPercent = maxLeaves > 0 ? (point.leaf_count! / maxLeaves) * 90 : 0;
              const leftPercent = (point.day / maxDay) * 100;
              const leftPixels = (leftPercent / 100) * 800 + 8;
              
              return (
                <View
                  key={`leaf-bar-${index}`}
                  style={[
                    styles.bar,
                    {
                      height: `${heightPercent}%`,
                      left: leftPixels,
                      backgroundColor: '#2196F3',
                      opacity: 0.8,
                      width: 6,
                    }
                  ]}
                >
                  <View style={[styles.barDot, { backgroundColor: '#2196F3' }]} />
                </View>
              );
            })}

            {/* Barras de ramos */}
            {dataWithBranches.map((point, index) => {
              const heightPercent = maxBranches > 0 ? (point.branch_count! / maxBranches) * 90 : 0;
              const leftPercent = (point.day / maxDay) * 100;
              const leftPixels = (leftPercent / 100) * 800 + 16;
              
              return (
                <View
                  key={`branch-bar-${index}`}
                  style={[
                    styles.bar,
                    {
                      height: `${heightPercent}%`,
                      left: leftPixels,
                      backgroundColor: '#FF9800',
                      opacity: 0.8,
                      width: 6,
                    }
                  ]}
                >
                  <View style={[styles.barDot, { backgroundColor: '#FF9800' }]} />
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Eixo X com datas */}
      <View style={styles.xAxis}>
        {xAxisDates.map((datePoint, index) => (
          <Text key={index} style={styles.axisLabel}>
            {datePoint.formattedDate}
          </Text>
        ))}
      </View>
      <Text style={styles.xAxisTitle}>Data dos Registros</Text>

      {/* Legenda dos dados */}
      <View style={styles.dataLegend}>
        {dataWithSize.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Tamanho (cm)</Text>
          </View>
        )}
        {dataWithLeaves.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.legendText}>Folhas</Text>
          </View>
        )}
        {dataWithBranches.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendText}>Ramos</Text>
          </View>
        )}
      </View>

      {/* Legenda das fases */}
      <View style={styles.legend}>
        {phaseMarkers.map((marker, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: marker.color }]} />
            <Text style={styles.legendText}>{marker.label}</Text>
          </View>
        ))}
      </View>

      {/* Estatísticas */}
      <View style={styles.stats}>
        {dataWithSize.length > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Tamanho</Text>
            <Text style={styles.statValue}>{dataWithSize[dataWithSize.length - 1]?.plant_size?.toFixed(1)} cm</Text>
          </View>
        )}
        {dataWithLeaves.length > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Folhas</Text>
            <Text style={styles.statValue}>{dataWithLeaves[dataWithLeaves.length - 1]?.leaf_count}</Text>
          </View>
        )}
        {dataWithBranches.length > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Ramos</Text>
            <Text style={styles.statValue}>{dataWithBranches[dataWithBranches.length - 1]?.branch_count}</Text>
          </View>
        )}
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Dias Total</Text>
          <Text style={styles.statValue}>{maxDay} dias</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chartWrapper: {
    width: 800,
    height: 300,
    position: 'relative',
    marginBottom: 8,
  },
  phasesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
  },
  phaseBar: {
    position: 'absolute',
    height: '100%',
    opacity: 0.15,
  },
  barsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    bottom: 0,
  },
  bar: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: -4,
    left: -1,
    borderWidth: 2,
    borderColor: '#fff',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  axisLabel: {
    fontSize: 10,
    color: '#666',
  },
  xAxisTitle: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  dataLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  legendLine: {
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
});
