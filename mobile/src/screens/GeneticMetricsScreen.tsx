import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { statisticsAPI, GeneticMetrics } from '../services/api';

type GeneticMetricsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  navigation: GeneticMetricsScreenNavigationProp;
};

export default function GeneticMetricsScreen({ navigation }: Props) {
  const [metrics, setMetrics] = useState<GeneticMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setError(null);
      const data = await statisticsAPI.getGeneticMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMetrics();
    setRefreshing(false);
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return '#999';
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#8BC34A';
    if (score >= 40) return '#FFC107';
    if (score >= 20) return '#FF9800';
    return '#f44336';
  };

  const getScoreLabel = (score: number | null) => {
    if (score === null) return 'Sem dados';
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    if (score >= 20) return 'Abaixo';
    return 'Crítico';
  };

  const renderGeneticCard = ({ item }: { item: GeneticMetrics }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('GeneticDetail', { id: item.id })}
    >
      {/* Header com nome e score */}
      <View style={styles.cardHeader}>
        <View style={styles.geneticInfo}>
          <Text style={styles.geneticName}>{item.name}</Text>
          {item.breeder && (
            <Text style={styles.breeder}>{item.breeder}</Text>
          )}
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.quality_score) }]}>
          <Text style={styles.scoreValue}>
            {item.quality_score !== null ? item.quality_score : '-'}
          </Text>
          <Text style={styles.scoreLabel}>{getScoreLabel(item.quality_score)}</Text>
        </View>
      </View>

      {/* Métricas de plantas */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{item.total_plants}</Text>
          <Text style={styles.metricLabel}>Total</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: '#4CAF50' }]}>{item.active_plants}</Text>
          <Text style={styles.metricLabel}>Ativas</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: '#f44336' }]}>{item.dead_plants}</Text>
          <Text style={styles.metricLabel}>Mortas</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: '#FF9800' }]}>{item.germination_failures}</Text>
          <Text style={styles.metricLabel}>Falha Germ.</Text>
        </View>
      </View>

      {/* Taxas */}
      <View style={styles.ratesContainer}>
        <View style={styles.rateItem}>
          <Text style={styles.rateLabel}>Taxa de Sucesso</Text>
          <View style={styles.rateBar}>
            <View 
              style={[
                styles.rateProgress, 
                { 
                  width: `${item.success_rate || 0}%`,
                  backgroundColor: getScoreColor(item.success_rate)
                }
              ]} 
            />
          </View>
          <Text style={styles.rateValue}>
            {item.success_rate !== null ? `${item.success_rate}%` : '-'}
          </Text>
        </View>
        
        <View style={styles.rateItem}>
          <Text style={styles.rateLabel}>Taxa de Germinação</Text>
          <View style={styles.rateBar}>
            <View 
              style={[
                styles.rateProgress, 
                { 
                  width: `${item.germination_rate || 0}%`,
                  backgroundColor: getScoreColor(item.germination_rate)
                }
              ]} 
            />
          </View>
          <Text style={styles.rateValue}>
            {item.germination_rate !== null ? `${item.germination_rate}%` : '-'}
          </Text>
        </View>
      </View>

      {/* Evolução */}
      {item.evolution.avg_phase_duration && (
        <View style={styles.evolutionContainer}>
          <Text style={styles.sectionTitle}>Velocidade de Evolução</Text>
          <View style={styles.evolutionRow}>
            <View style={styles.evolutionItem}>
              <Text style={styles.evolutionValue}>
                {item.evolution.avg_phase_duration}
              </Text>
              <Text style={styles.evolutionLabel}>Média (dias/fase)</Text>
            </View>
            <View style={styles.evolutionItem}>
              <Text style={[styles.evolutionValue, { color: '#4CAF50' }]}>
                {item.evolution.min_phase_duration || '-'}
              </Text>
              <Text style={styles.evolutionLabel}>Mínimo</Text>
            </View>
            <View style={styles.evolutionItem}>
              <Text style={[styles.evolutionValue, { color: '#f44336' }]}>
                {item.evolution.max_phase_duration || '-'}
              </Text>
              <Text style={styles.evolutionLabel}>Máximo</Text>
            </View>
          </View>
        </View>
      )}

      {/* Crescimento */}
      {item.growth.max_height && (
        <View style={styles.growthContainer}>
          <Text style={styles.sectionTitle}>Crescimento</Text>
          <View style={styles.growthRow}>
            <Text style={styles.growthText}>
              Altura máx: <Text style={styles.growthValue}>{item.growth.max_height}cm</Text>
            </Text>
            {item.growth.avg_height && (
              <Text style={styles.growthText}>
                Média: <Text style={styles.growthValue}>{item.growth.avg_height}cm</Text>
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Info adicional */}
      <View style={styles.footerInfo}>
        {item.type && (
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{item.type}</Text>
          </View>
        )}
        {item.difficulty && (
          <View style={[styles.tagBadge, styles.difficultyBadge]}>
            <Text style={styles.tagText}>{item.difficulty}</Text>
          </View>
        )}
        {item.flowering_time_min && item.flowering_time_max && (
          <Text style={styles.floweringText}>
            Floração: {item.flowering_time_min}-{item.flowering_time_max} semanas
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2d5016" />
        <Text style={styles.loadingText}>Calculando métricas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadMetrics}>
          <Text style={styles.retryText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (metrics.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={styles.emptyText}>Nenhuma genética cadastrada</Text>
        <Text style={styles.emptySubtext}>
          Cadastre genéticas no Banco Genético para ver as métricas
        </Text>
      </View>
    );
  }

  // Separar genéticas com e sem dados
  const withData = metrics.filter(m => m.total_plants > 0);
  const withoutData = metrics.filter(m => m.total_plants === 0);

  return (
    <View style={styles.container}>
      {/* Header com resumo */}
      <View style={styles.summaryHeader}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{metrics.length}</Text>
          <Text style={styles.summaryLabel}>Genéticas</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{withData.length}</Text>
          <Text style={styles.summaryLabel}>Com Plantas</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {withData.filter(m => (m.quality_score || 0) >= 60).length}
          </Text>
          <Text style={styles.summaryLabel}>Score Bom+</Text>
        </View>
      </View>

      <FlatList
        data={metrics}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderGeneticCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          withData.length > 0 ? (
            <Text style={styles.listSectionTitle}>
              Genéticas Ranqueadas por Qualidade
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2d5016',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    backgroundColor: '#2d5016',
    padding: 16,
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#c8e6c9',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  geneticInfo: {
    flex: 1,
  },
  geneticName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  breeder: {
    fontSize: 14,
    color: '#7B68EE',
    marginTop: 2,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 70,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#fff',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  metricLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  ratesContainer: {
    gap: 12,
    marginBottom: 16,
  },
  rateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rateLabel: {
    fontSize: 12,
    color: '#666',
    width: 120,
  },
  rateBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  rateProgress: {
    height: '100%',
    borderRadius: 4,
  },
  rateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    width: 45,
    textAlign: 'right',
  },
  evolutionContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  evolutionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  evolutionItem: {
    alignItems: 'center',
  },
  evolutionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  evolutionLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  growthContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginBottom: 12,
  },
  growthRow: {
    flexDirection: 'row',
    gap: 20,
  },
  growthText: {
    fontSize: 14,
    color: '#666',
  },
  growthValue: {
    fontWeight: '600',
    color: '#333',
  },
  footerInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  tagBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  difficultyBadge: {
    backgroundColor: '#fff3e0',
  },
  tagText: {
    fontSize: 12,
    color: '#333',
    textTransform: 'capitalize',
  },
  floweringText: {
    fontSize: 12,
    color: '#666',
  },
});
