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
import { theme } from '../theme';

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
    if (score === null) return theme.colors.textSecondary;
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.secondary[500];
    if (score >= 40) return theme.colors.phases.harvest;
    if (score >= 20) return theme.colors.warning;
    return theme.colors.error;
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
      onPress={() => navigation.navigate('GeneticDetail', { id: item.genetic_id })}
    >
      {/* Header com nome e score */}
      <View style={styles.cardHeader}>
        <View style={styles.geneticInfo}>
          <Text style={styles.geneticName}>{item.genetic_name}</Text>
          {item.breeder && (
            <Text style={styles.breeder}>{item.breeder}</Text>
          )}
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.success_rate) }]}>
          <Text style={styles.scoreValue}>
            {item.success_rate !== null ? item.success_rate : '-'}
          </Text>
          <Text style={styles.scoreLabel}>{getScoreLabel(item.success_rate)}</Text>
        </View>
      </View>

      {/* Métricas de plantas */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{item.total_plants}</Text>
          <Text style={styles.metricLabel}>Total</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: theme.colors.success }]}>{item.active_plants}</Text>
          <Text style={styles.metricLabel}>Ativas</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: theme.colors.error }]}>{item.dead_plants}</Text>
          <Text style={styles.metricLabel}>Mortas</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: theme.colors.phases.harvest }]}>{item.harvested_plants}</Text>
          <Text style={styles.metricLabel}>Colhidas</Text>
        </View>
      </View>

      {/* Resumo de plantas */}
      <View style={styles.plantsSummary}>
        <Text style={styles.summaryText}>
          Plantas: {item.active_plants} ativas, {item.dead_plants} mortas
        </Text>
      </View>

      {/* Taxas */}
      <View style={styles.ratesContainer}>
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
      </View>

      {/* Tempos médios */}
      {(item.avg_germination_days || item.avg_vegetation_days || item.avg_flowering_days) && (
        <View style={styles.evolutionContainer}>
          <Text style={styles.sectionTitle}>Tempos Médios (dias)</Text>
          <View style={styles.evolutionRow}>
            {item.avg_germination_days && (
              <View style={styles.evolutionItem}>
                <Text style={styles.evolutionValue}>
                  {item.avg_germination_days}
                </Text>
                <Text style={styles.evolutionLabel}>Germinação</Text>
              </View>
            )}
            {item.avg_vegetation_days && (
              <View style={styles.evolutionItem}>
                <Text style={[styles.evolutionValue, { color: theme.colors.phases.vegetative }]}>
                  {item.avg_vegetation_days}
                </Text>
                <Text style={styles.evolutionLabel}>Vegetação</Text>
              </View>
            )}
            {item.avg_flowering_days && (
              <View style={styles.evolutionItem}>
                <Text style={[styles.evolutionValue, { color: theme.colors.phases.flowering }]}>
                  {item.avg_flowering_days}
                </Text>
                <Text style={styles.evolutionLabel}>Floração</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Estatísticas de sementes */}
      <View style={styles.footerInfo}>
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            Lotes: {item.total_batches}
          </Text>
          <Text style={styles.statsText}>
            Sementes disponíveis: {item.total_seeds_available}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            Clones: {item.clones_generated}
          </Text>
          <Text style={styles.statsText}>
            Última atividade: {new Date(item.last_activity).toLocaleDateString('pt-BR')}
          </Text>
        </View>
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
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.base,
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary[800],
    paddingHorizontal: theme.spacing['2xl'],
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  retryText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.semibold,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary[800],
    padding: theme.spacing.lg,
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.surface,
  },
  summaryLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary[200],
    marginTop: theme.spacing.sm,
  },
  listContainer: {
    padding: theme.spacing.lg,
  },
  listSectionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  geneticInfo: {
    flex: 1,
  },
  geneticName: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  breeder: {
    fontSize: theme.typography.sizes.sm,
    color: '#7B68EE',
    marginTop: theme.spacing.xs,
  },
  scoreBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    minWidth: 70,
  },
  scoreValue: {
    fontSize: theme.typography.sizes['3xl'],
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.surface,
  },
  scoreLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.surface,
    marginTop: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  metricLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  ratesContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  rateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  rateLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    width: 120,
  },
  rateBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  rateProgress: {
    height: '100%',
    borderRadius: 4,
  },
  rateValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    width: 45,
    textAlign: 'right',
  },
  evolutionContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
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
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  evolutionLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  growthContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  growthRow: {
    flexDirection: 'row',
    gap: theme.spacing['2xl'],
  },
  growthText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  growthValue: {
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  footerInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  tagBadge: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  difficultyBadge: {
    backgroundColor: theme.colors.warning[50],
  },
  tagText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  floweringText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  plantsSummary: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.sm,
  },
  summaryText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: theme.typography.weights.medium,
  },
});
