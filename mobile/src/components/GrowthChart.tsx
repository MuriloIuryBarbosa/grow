import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import Svg, { Line, Circle, G, Text as SvgText, Rect, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { format, differenceInDays } from 'date-fns';
import { parseDate } from '../utils/date.utils';
import { DailyRecord, Plant } from '../types';

interface GrowthChartProps {
  records: DailyRecord[];
  plant: Plant;
}

interface TooltipData {
  index: number;
  x: number;
  y: number;
  date: string;
  day: number;
  size: number | null;
  leaves: number | null;
  branches: number | null;
}

interface DataPoint {
  day: number;
  date: string;
  size: number | null;
  leaves: number | null;
  branches: number | null;
  evolutionScore?: number;
}

const CHART_HEIGHT = 200;
const MINI_CHART_HEIGHT = 120;
const POINT_SPACING = 60;
const PADDING_LEFT = 40;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 40;

const COLORS = {
  size: '#4CAF50',
  leaves: '#2196F3',
  branches: '#FF9800',
  evolution: '#9C27B0',
};

export default function GrowthChart({ records, plant }: GrowthChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<TooltipData | null>(null);
  
  const dataPoints = useMemo(() => {
    if (records.length === 0 || !plant.germination_date) return [];
    
    const germinationDate = parseDate(plant.germination_date);
    
    const sortedRecords = [...records].sort((a, b) => 
      parseDate(a.record_date).getTime() - parseDate(b.record_date).getTime()
    );
    
    return sortedRecords
      .filter(record => 
        (record.plant_size !== undefined && record.plant_size !== null) ||
        (record.leaf_count !== undefined && record.leaf_count !== null) ||
        (record.branch_count !== undefined && record.branch_count !== null)
      )
      .map(record => {
        const recordDate = parseDate(record.record_date);
        const day = differenceInDays(recordDate, germinationDate);
        return {
          day,
          date: format(recordDate, 'dd/MM'),
          size: record.plant_size ?? null,
          leaves: record.leaf_count ?? null,
          branches: record.branch_count ?? null,
        };
      });
  }, [records, plant.germination_date]);

  const maxValues = useMemo(() => {
    const sizes = dataPoints.filter(d => d.size !== null).map(d => d.size as number);
    const leaves = dataPoints.filter(d => d.leaves !== null).map(d => d.leaves as number);
    const branches = dataPoints.filter(d => d.branches !== null).map(d => d.branches as number);
    
    return {
      size: sizes.length > 0 ? Math.max(...sizes) * 1.1 : 0,
      leaves: leaves.length > 0 ? Math.max(...leaves) * 1.1 : 0,
      branches: branches.length > 0 ? Math.max(...branches) * 1.1 : 0,
    };
  }, [dataPoints]);

  // Motor de Cálculo de Evolução Geral
  // Este cálculo considera as 3 variáveis normalizadas e pondera:
  // - Tamanho: 40% (principal indicador de crescimento)
  // - Folhas: 35% (indica saúde e capacidade fotossintética)
  // - Ramos: 25% (indica ramificação e potencial de produção)
  const evolutionData = useMemo(() => {
    if (dataPoints.length === 0) return [];
    
    // Encontrar valores máximos para normalização
    const maxSize = Math.max(...dataPoints.filter(d => d.size !== null).map(d => d.size as number), 1);
    const maxLeaves = Math.max(...dataPoints.filter(d => d.leaves !== null).map(d => d.leaves as number), 1);
    const maxBranches = Math.max(...dataPoints.filter(d => d.branches !== null).map(d => d.branches as number), 1);
    
    // Pesos para cada variável
    const WEIGHT_SIZE = 0.40;
    const WEIGHT_LEAVES = 0.35;
    const WEIGHT_BRANCHES = 0.25;
    
    return dataPoints.map((point, index) => {
      // Normalizar cada valor (0-100)
      const normalizedSize = point.size !== null ? (point.size / maxSize) * 100 : null;
      const normalizedLeaves = point.leaves !== null ? (point.leaves / maxLeaves) * 100 : null;
      const normalizedBranches = point.branches !== null ? (point.branches / maxBranches) * 100 : null;
      
      // Calcular score de evolução
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
      
      // Score final normalizado (0-100)
      const evolutionScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
      
      return {
        ...point,
        evolutionScore,
      };
    });
  }, [dataPoints]);

  const maxEvolution = useMemo(() => {
    const scores = evolutionData.filter(d => d.evolutionScore > 0).map(d => d.evolutionScore);
    return scores.length > 0 ? Math.max(...scores) * 1.1 : 100;
  }, [evolutionData]);

  const hasData = dataPoints.length > 0 && (maxValues.size > 0 || maxValues.leaves > 0 || maxValues.branches > 0);

  if (!hasData) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>📊 Sem dados suficientes para gerar gráfico</Text>
        <Text style={styles.emptySubtext}>Adicione registros com tamanho, folhas ou ramos</Text>
      </View>
    );
  }

  const lastValues = useMemo(() => {
    const lastWithSize = [...dataPoints].reverse().find(d => d.size !== null);
    const lastWithLeaves = [...dataPoints].reverse().find(d => d.leaves !== null);
    const lastWithBranches = [...dataPoints].reverse().find(d => d.branches !== null);
    return {
      size: lastWithSize?.size ?? null,
      leaves: lastWithLeaves?.leaves ?? null,
      branches: lastWithBranches?.branches ?? null,
      totalDays: dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].day : 0,
    };
  }, [dataPoints]);

  const chartWidth = Math.max(dataPoints.length * POINT_SPACING + PADDING_LEFT + 20, 300);
  const svgHeight = CHART_HEIGHT + PADDING_TOP + PADDING_BOTTOM;

  // Função para calcular a posição Y (0 = bottom, max = top)
  const getY = (value: number | null, maxValue: number): number => {
    if (value === null || maxValue === 0) return svgHeight - PADDING_BOTTOM;
    const ratio = value / maxValue;
    return PADDING_TOP + CHART_HEIGHT * (1 - ratio);
  };

  // Função para calcular a posição X
  const getX = (index: number): number => {
    return PADDING_LEFT + index * POINT_SPACING;
  };

  // Gerar pontos para cada série
  const sizePoints = dataPoints.filter(d => d.size !== null);
  const leavesPoints = dataPoints.filter(d => d.leaves !== null);
  const branchesPoints = dataPoints.filter(d => d.branches !== null);

  const handlePointPress = (index: number) => {
    const point = dataPoints[index];
    if (selectedPoint?.index === index) {
      setSelectedPoint(null);
    } else {
      setSelectedPoint({
        index,
        x: getX(index),
        y: PADDING_TOP,
        date: point.date,
        day: point.day,
        size: point.size,
        leaves: point.leaves,
        branches: point.branches,
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📈 Evolução da Planta</Text>
      
      {/* Tooltip fixo no topo */}
      {selectedPoint && (
        <View style={styles.tooltip}>
          <View style={styles.tooltipHeader}>
            <Text style={styles.tooltipDate}>📅 {selectedPoint.date}</Text>
            <Text style={styles.tooltipDay}>Dia {selectedPoint.day}</Text>
            <Pressable onPress={() => setSelectedPoint(null)} style={styles.tooltipClose}>
              <Text style={styles.tooltipCloseText}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.tooltipValues}>
            {selectedPoint.size !== null && (
              <View style={styles.tooltipValue}>
                <View style={[styles.tooltipDot, { backgroundColor: COLORS.size }]} />
                <Text style={styles.tooltipText}>Tamanho: <Text style={{ fontWeight: 'bold', color: COLORS.size }}>{selectedPoint.size} cm</Text></Text>
              </View>
            )}
            {selectedPoint.leaves !== null && (
              <View style={styles.tooltipValue}>
                <View style={[styles.tooltipDot, { backgroundColor: COLORS.leaves }]} />
                <Text style={styles.tooltipText}>Folhas: <Text style={{ fontWeight: 'bold', color: COLORS.leaves }}>{selectedPoint.leaves}</Text></Text>
              </View>
            )}
            {selectedPoint.branches !== null && (
              <View style={styles.tooltipValue}>
                <View style={[styles.tooltipDot, { backgroundColor: COLORS.branches }]} />
                <Text style={styles.tooltipText}>Ramos: <Text style={{ fontWeight: 'bold', color: COLORS.branches }}>{selectedPoint.branches}</Text></Text>
              </View>
            )}
          </View>
        </View>
      )}
      
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={{ position: 'relative' }}>
          <Svg width={chartWidth} height={svgHeight}>
            {/* Grid lines horizontais */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <Line
                key={`grid-${i}`}
                x1={PADDING_LEFT - 10}
                y1={PADDING_TOP + CHART_HEIGHT * (1 - ratio)}
                x2={chartWidth - 10}
                y2={PADDING_TOP + CHART_HEIGHT * (1 - ratio)}
                stroke="#e0e0e0"
                strokeWidth={1}
              />
            ))}

            {/* Linha de Tamanho (verde) */}
            {sizePoints.length > 1 && (
              <G>
                {sizePoints.map((point, i) => {
                  const currentIndex = dataPoints.indexOf(point);
                  if (i === 0) return null;
                  const prevPoint = sizePoints[i - 1];
                  const prevIndex = dataPoints.indexOf(prevPoint);
                  return (
                    <Line
                      key={`size-line-${i}`}
                      x1={getX(prevIndex)}
                      y1={getY(prevPoint.size, maxValues.size)}
                      x2={getX(currentIndex)}
                      y2={getY(point.size, maxValues.size)}
                      stroke={COLORS.size}
                      strokeWidth={3}
                    />
                  );
                })}
              </G>
            )}

            {/* Linha de Folhas (azul) */}
            {leavesPoints.length > 1 && (
              <G>
                {leavesPoints.map((point, i) => {
                  const currentIndex = dataPoints.indexOf(point);
                  if (i === 0) return null;
                  const prevPoint = leavesPoints[i - 1];
                  const prevIndex = dataPoints.indexOf(prevPoint);
                  return (
                    <Line
                      key={`leaves-line-${i}`}
                      x1={getX(prevIndex)}
                      y1={getY(prevPoint.leaves, maxValues.leaves)}
                      x2={getX(currentIndex)}
                      y2={getY(point.leaves, maxValues.leaves)}
                      stroke={COLORS.leaves}
                      strokeWidth={3}
                    />
                  );
                })}
              </G>
            )}

            {/* Linha de Ramos (laranja) */}
            {branchesPoints.length > 1 && (
              <G>
                {branchesPoints.map((point, i) => {
                  const currentIndex = dataPoints.indexOf(point);
                  if (i === 0) return null;
                  const prevPoint = branchesPoints[i - 1];
                  const prevIndex = dataPoints.indexOf(prevPoint);
                  return (
                    <Line
                      key={`branches-line-${i}`}
                      x1={getX(prevIndex)}
                      y1={getY(prevPoint.branches, maxValues.branches)}
                      x2={getX(currentIndex)}
                      y2={getY(point.branches, maxValues.branches)}
                      stroke={COLORS.branches}
                      strokeWidth={3}
                    />
                  );
                })}
              </G>
            )}

            {/* Círculos nos pontos de dados */}
            {dataPoints.map((point, index) => (
              <G key={`points-${index}`}>
                {point.size !== null && (
                  <Circle
                    cx={getX(index)}
                    cy={getY(point.size, maxValues.size)}
                    r={selectedPoint?.index === index ? 9 : 6}
                    fill={COLORS.size}
                    stroke={selectedPoint?.index === index ? '#fff' : 'none'}
                    strokeWidth={2}
                  />
                )}
                {point.leaves !== null && (
                  <Circle
                    cx={getX(index)}
                    cy={getY(point.leaves, maxValues.leaves)}
                    r={selectedPoint?.index === index ? 9 : 6}
                    fill={COLORS.leaves}
                    stroke={selectedPoint?.index === index ? '#fff' : 'none'}
                    strokeWidth={2}
                  />
                )}
                {point.branches !== null && (
                  <Circle
                    cx={getX(index)}
                    cy={getY(point.branches, maxValues.branches)}
                    r={selectedPoint?.index === index ? 9 : 6}
                    fill={COLORS.branches}
                    stroke={selectedPoint?.index === index ? '#fff' : 'none'}
                    strokeWidth={2}
                  />
                )}
              </G>
            ))}

            {/* Linha vertical indicando ponto selecionado */}
            {selectedPoint && (
              <Line
                x1={selectedPoint.x}
                y1={PADDING_TOP}
                x2={selectedPoint.x}
                y2={svgHeight - PADDING_BOTTOM}
                stroke="#666"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            )}

            {/* Labels de data no eixo X */}
            {dataPoints.map((point, index) => (
              <G key={`label-${index}`}>
                <SvgText
                  x={getX(index)}
                  y={svgHeight - 18}
                  fontSize={10}
                  fill={selectedPoint?.index === index ? '#333' : '#666'}
                  fontWeight={selectedPoint?.index === index ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {point.date}
                </SvgText>
                <SvgText
                  x={getX(index)}
                  y={svgHeight - 5}
                  fontSize={9}
                  fill={selectedPoint?.index === index ? '#666' : '#999'}
                  textAnchor="middle"
                >
                  D{point.day}
                </SvgText>
              </G>
            ))}
          </Svg>
          
          {/* Áreas de toque invisíveis para cada ponto */}
          {dataPoints.map((point, index) => (
            <TouchableOpacity
              key={`touch-${index}`}
              style={{
                position: 'absolute',
                left: getX(index) - 20,
                top: PADDING_TOP - 10,
                width: 40,
                height: CHART_HEIGHT + 20,
              }}
              onPress={() => handlePointPress(index)}
              activeOpacity={0.7}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.legend}>
        {maxValues.size > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.size }]} />
            <Text style={styles.legendText}>Tamanho (cm)</Text>
          </View>
        )}
        {maxValues.leaves > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.leaves }]} />
            <Text style={styles.legendText}>Folhas</Text>
          </View>
        )}
        {maxValues.branches > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.branches }]} />
            <Text style={styles.legendText}>Ramos</Text>
          </View>
        )}
      </View>

      <View style={styles.stats}>
        {lastValues.size !== null && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Tamanho</Text>
            <Text style={[styles.statValue, { color: COLORS.size }]}>{lastValues.size} cm</Text>
          </View>
        )}
        {lastValues.leaves !== null && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Folhas</Text>
            <Text style={[styles.statValue, { color: COLORS.leaves }]}>{lastValues.leaves}</Text>
          </View>
        )}
        {lastValues.branches !== null && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Ramos</Text>
            <Text style={[styles.statValue, { color: COLORS.branches }]}>{lastValues.branches}</Text>
          </View>
        )}
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Dias</Text>
          <Text style={[styles.statValue, { color: '#666' }]}>{lastValues.totalDays}</Text>
        </View>
      </View>

      {/* Gráficos Individuais */}
      <View style={styles.individualChartsSection}>
        <Text style={styles.sectionTitle}>📊 Análise Detalhada</Text>
        
        {/* Gráfico de Tamanho */}
        {maxValues.size > 0 && (
          <MiniChart
            title="📏 Tamanho (cm)"
            data={dataPoints}
            valueKey="size"
            maxValue={maxValues.size}
            color={COLORS.size}
            unit="cm"
          />
        )}
        
        {/* Gráfico de Folhas */}
        {maxValues.leaves > 0 && (
          <MiniChart
            title="🌿 Quantidade de Folhas"
            data={dataPoints}
            valueKey="leaves"
            maxValue={maxValues.leaves}
            color={COLORS.leaves}
            unit=""
          />
        )}
        
        {/* Gráfico de Ramos */}
        {maxValues.branches > 0 && (
          <MiniChart
            title="🌳 Quantidade de Ramos"
            data={dataPoints}
            valueKey="branches"
            maxValue={maxValues.branches}
            color={COLORS.branches}
            unit=""
          />
        )}
        
        {/* Gráfico de Evolução Geral */}
        {evolutionData.length > 0 && evolutionData.some(d => d.evolutionScore > 0) && (
          <View style={styles.evolutionChartContainer}>
            <View style={styles.evolutionHeader}>
              <Text style={styles.miniChartTitle}>🚀 Evolução Geral</Text>
              <View style={styles.evolutionBadge}>
                <Text style={styles.evolutionBadgeText}>
                  {evolutionData[evolutionData.length - 1]?.evolutionScore?.toFixed(1) || 0}%
                </Text>
              </View>
            </View>
            <Text style={styles.evolutionDescription}>
              Score calculado: Tamanho (40%) + Folhas (35%) + Ramos (25%)
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
      </View>
    </View>
  );
}

// Componente de Mini Gráfico Individual
interface MiniChartProps {
  title: string;
  data: DataPoint[];
  valueKey: 'size' | 'leaves' | 'branches' | 'evolutionScore';
  maxValue: number;
  color: string;
  unit: string;
  showGradient?: boolean;
}

function MiniChart({ title, data, valueKey, maxValue, color, unit, showGradient }: MiniChartProps) {
  const filteredData = data.filter(d => d[valueKey] !== null && d[valueKey] !== undefined);
  
  if (filteredData.length === 0) return null;
  
  const chartWidth = Math.max(filteredData.length * 50 + 50, 280);
  const svgHeight = MINI_CHART_HEIGHT + 30;
  
  const getY = (value: number | null): number => {
    if (value === null || maxValue === 0) return svgHeight - 20;
    const ratio = value / maxValue;
    return 10 + MINI_CHART_HEIGHT * (1 - ratio);
  };
  
  const getX = (index: number): number => {
    return 30 + index * 50;
  };
  
  // Criar path para área preenchida (se gradient)
  const areaPath = useMemo(() => {
    if (!showGradient || filteredData.length < 2) return '';
    
    let path = `M ${getX(0)} ${svgHeight - 20}`;
    filteredData.forEach((point, index) => {
      const dataIndex = data.indexOf(point);
      const y = getY(point[valueKey] as number);
      path += ` L ${getX(index)} ${y}`;
    });
    path += ` L ${getX(filteredData.length - 1)} ${svgHeight - 20} Z`;
    return path;
  }, [filteredData, showGradient]);
  
  const lastValue = filteredData[filteredData.length - 1]?.[valueKey];
  const firstValue = filteredData[0]?.[valueKey];
  const growth = lastValue && firstValue ? (((lastValue as number) - (firstValue as number)) / (firstValue as number) * 100).toFixed(0) : null;
  
  return (
    <View style={styles.miniChartContainer}>
      {title !== '' && (
        <View style={styles.miniChartHeader}>
          <Text style={styles.miniChartTitle}>{title}</Text>
          <View style={styles.miniChartStats}>
            <Text style={[styles.miniChartValue, { color }]}>
              {lastValue}{unit}
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
              <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
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
          
          {/* Área preenchida (gradient) */}
          {showGradient && areaPath && (
            <Path d={areaPath} fill="url(#areaGradient)" />
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
              fontSize={9}
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  tooltip: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tooltipDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  tooltipDay: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e8e8e8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  tooltipClose: {
    padding: 4,
  },
  tooltipCloseText: {
    fontSize: 16,
    color: '#999',
    fontWeight: 'bold',
  },
  tooltipValues: {
    gap: 6,
  },
  tooltipValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tooltipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tooltipText: {
    fontSize: 13,
    color: '#444',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
  },
  // Estilos para gráficos individuais
  individualChartsSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
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
});
