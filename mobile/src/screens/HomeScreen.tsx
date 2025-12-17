import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { usePlants } from '../hooks/usePlants';
import { Plant } from '../types';
import { formatDateLocal } from '../utils/date.utils';
import PlantCard from '../components/PlantCard';
import SensorDashboard from '../components/SensorDashboard';
import PlantRanking from '../components/PlantRanking';
import DashboardEvolutionCharts from '../components/DashboardEvolutionCharts';
import { statisticsAPI, PhaseStatistics } from '../services/api';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

const PHASE_LABELS = {
  germinacao: '🌱 Germinação',
  muda: '🌿 Muda',
  vegetacao: '🌳 Vegetação',
  floracao: '🌸 Floração',
};

const STATUS_LABELS = {
  ativa: '✅ Ativa',
  morta: '❌ Morta',
  falha_germinacao: '⚠️ Falha na germinação',
};

export default function HomeScreen({ navigation }: Props) {
  const { plants, loading, error, refetch } = usePlants();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plants' | 'dead'>('dashboard');
  const [phaseStats, setPhaseStats] = useState<PhaseStatistics[]>([]);

  useEffect(() => {
    loadPhaseStats();
  }, []);

  const loadPhaseStats = async () => {
    try {
      const stats = await statisticsAPI.getPhaseStats();
      setPhaseStats(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas de fases:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), loadPhaseStats()]);
    setRefreshing(false);
  };

  // Separar plantas ativas e mortas
  const activePlants = plants.filter(p => p.status === 'ativa');
  const deadPlants = plants.filter(p => p.status === 'morta' || p.status === 'falha_germinacao');

  const getStats = () => {
    const stats = {
      total: plants.length,
      germinacao: activePlants.filter((p) => p.current_phase === 'germinacao').length,
      muda: activePlants.filter((p) => p.current_phase === 'muda').length,
      vegetacao: activePlants.filter((p) => p.current_phase === 'vegetacao').length,
      floracao: activePlants.filter((p) => p.current_phase === 'floracao').length,
      ativas: activePlants.length,
      mortas: deadPlants.length,
    };
    return stats;
  };

  const getPhaseStatData = (phase: string) => {
    const stat = phaseStats.find(s => s.phase === phase);
    return {
      avg: stat?.avg_days ?? '-',
      min: stat?.min_days ?? '-',
      max: stat?.max_days ?? '-',
    };
  };

  const renderPhaseEvolutionRow = (phase: string, label: string, color: string) => {
    const data = getPhaseStatData(phase);
    return (
      <View style={styles.phaseEvolutionRow}>
        <View style={[styles.phaseEvolutionCol1, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
          <View style={[styles.phaseEvolutionDot, { backgroundColor: color }]} />
          <Text style={styles.phaseEvolutionLabel}>{label}</Text>
        </View>
        <Text style={[styles.phaseEvolutionValue, styles.phaseEvolutionCol2]}>{data.avg}</Text>
        <Text style={[styles.phaseEvolutionValue, styles.phaseEvolutionCol3, { color: '#4CAF50' }]}>{data.min}</Text>
        <Text style={[styles.phaseEvolutionValue, styles.phaseEvolutionCol4, { color: '#f44336' }]}>{data.max}</Text>
      </View>
    );
  };

  const renderPlantCard = ({ item }: { item: Plant }) => (
    <PlantCard
      plant={item}
      onPress={() => navigation.navigate('PlantDetail', { id: item.id! })}
    />
  );

  const renderDashboard = () => {
    const stats = getStats();
    
    return (
      <ScrollView
        style={styles.dashboard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total de Plantas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.ativas}</Text>
            <Text style={styles.statLabel}>Plantas Ativas</Text>
          </View>
          <TouchableOpacity 
            style={styles.deadStatCard}
            onPress={() => setActiveTab('dead')}
          >
            <Text style={styles.deadStatValue}>{stats.mortas}</Text>
            <Text style={styles.deadStatLabel}>Mortas</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Por Fase (Ativas)</Text>
        <View style={styles.phaseGridCompact}>
          <View style={[styles.phaseCardCompact, styles.germinacaoCardCompact]}>
            <Text style={styles.phaseValueCompact}>{stats.germinacao}</Text>
            <Text style={styles.phaseLabelCompact}>Germ.</Text>
          </View>
          <View style={[styles.phaseCardCompact, styles.mudaCardCompact]}>
            <Text style={styles.phaseValueCompact}>{stats.muda}</Text>
            <Text style={styles.phaseLabelCompact}>Muda</Text>
          </View>
          <View style={[styles.phaseCardCompact, styles.vegetacaoCardCompact]}>
            <Text style={styles.phaseValueCompact}>{stats.vegetacao}</Text>
            <Text style={styles.phaseLabelCompact}>Veg.</Text>
          </View>
          <View style={[styles.phaseCardCompact, styles.floracaoCardCompact]}>
            <Text style={styles.phaseValueCompact}>{stats.floracao}</Text>
            <Text style={styles.phaseLabelCompact}>Flor.</Text>
          </View>
        </View>

        {/* Estatísticas de Evolução por Fase */}
        <Text style={styles.sectionTitle}>Evolução das Fases (dias)</Text>
        <View style={styles.phaseEvolutionContainer}>
          {/* Header */}
          <View style={styles.phaseEvolutionHeader}>
            <Text style={[styles.phaseEvolutionHeaderText, styles.phaseEvolutionCol1]}>Fase</Text>
            <Text style={[styles.phaseEvolutionHeaderText, styles.phaseEvolutionCol2]}>Média</Text>
            <Text style={[styles.phaseEvolutionHeaderText, styles.phaseEvolutionCol3]}>Mín</Text>
            <Text style={[styles.phaseEvolutionHeaderText, styles.phaseEvolutionCol4]}>Máx</Text>
          </View>
          
          {/* Germinação */}
          {renderPhaseEvolutionRow('germinacao', 'Germinação', '#4CAF50')}
          {/* Muda */}
          {renderPhaseEvolutionRow('muda', 'Muda', '#2196F3')}
          {/* Vegetação */}
          {renderPhaseEvolutionRow('vegetacao', 'Vegetação', '#9C27B0')}
          {/* Floração */}
          {renderPhaseEvolutionRow('floracao', 'Floração', '#FF9800')}
        </View>

        {/* Gráficos de Evolução Geral */}
        <DashboardEvolutionCharts 
          plants={plants}
          onPlantPress={(id) => navigation.navigate('PlantDetail', { id })}
        />

        {/* Ranking de Evolução */}
        <PlantRanking 
          plants={plants}
          onPlantPress={(id) => navigation.navigate('PlantDetail', { id })}
        />

        <Text style={styles.sectionTitle}>Dados dos Sensores</Text>
        <SensorDashboard />

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.geneticButton}
            onPress={() => navigation.navigate('GeneticBank')}
          >
            <Text style={styles.buttonText}>Banco Genético</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Sensors')}
          >
            <Text style={styles.buttonText}>Gerenciar Sensores</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderPlants = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2d5016" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activePlants.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Nenhuma planta ativa</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={activePlants}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={renderPlantCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
      />
    );
  };

  const renderDeadPlants = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2d5016" />
        </View>
      );
    }

    if (deadPlants.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🌱</Text>
          <Text style={styles.emptyText}>Nenhuma planta morta</Text>
          <Text style={styles.emptySubtext}>Suas plantas estão todas saudáveis!</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={deadPlants}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={renderPlantCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <View style={styles.deadListHeader}>
            <Text style={styles.deadListHeaderText}>
              💀 {deadPlants.length} {deadPlants.length === 1 ? 'planta morta' : 'plantas mortas'}
            </Text>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderDashboard()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2d5016',
  },
  deadTab: {
    borderBottomColor: '#ef4444',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#2d5016',
    fontWeight: 'bold',
  },
  deadTabText: {
    color: '#ef4444',
  },
  dashboard: {
    flex: 1,
    padding: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  deadStatCard: {
    flex: 1,
    backgroundColor: '#fef2f2',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ef4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deadStatValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  deadStatLabel: {
    fontSize: 12,
    color: '#991b1b',
    marginTop: 5,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  // Cards de fase compactos (4 em linha)
  phaseGridCompact: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  phaseCardCompact: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderLeftWidth: 3,
  },
  germinacaoCardCompact: { backgroundColor: '#e8f5e9', borderLeftColor: '#4CAF50' },
  mudaCardCompact: { backgroundColor: '#e3f2fd', borderLeftColor: '#2196F3' },
  vegetacaoCardCompact: { backgroundColor: '#f3e5f5', borderLeftColor: '#9C27B0' },
  floracaoCardCompact: { backgroundColor: '#fff3e0', borderLeftColor: '#FF9800' },
  phaseValueCompact: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#333',
  },
  phaseLabelCompact: { 
    fontSize: 10, 
    color: '#666', 
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Tabela de evolução de fases
  phaseEvolutionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  phaseEvolutionHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 4,
  },
  phaseEvolutionHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  phaseEvolutionRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    alignItems: 'center',
  },
  phaseEvolutionCol1: { flex: 2 },
  phaseEvolutionCol2: { flex: 1, textAlign: 'center' },
  phaseEvolutionCol3: { flex: 1, textAlign: 'center' },
  phaseEvolutionCol4: { flex: 1, textAlign: 'center' },
  phaseEvolutionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  phaseEvolutionLabel: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  phaseEvolutionValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  // Estilos antigos mantidos para compatibilidade
  phaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  phaseCard: {
    width: '48%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  germinacaoCard: { backgroundColor: '#e8f5e9' },
  mudaCard: { backgroundColor: '#e3f2fd' },
  vegetacaoCard: { backgroundColor: '#f3e5f5' },
  floracaoCard: { backgroundColor: '#fff3e0' },
  phaseIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  germinacaoIndicator: { backgroundColor: '#4CAF50' },
  mudaIndicator: { backgroundColor: '#2196F3' },
  vegetacaoIndicator: { backgroundColor: '#9C27B0' },
  floracaoIndicator: { backgroundColor: '#FF9800' },
  phaseValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  phaseLabel: { fontSize: 12, color: '#666', marginTop: 5 },
  actionButtons: {
    gap: 10,
  },
  geneticButton: {
    backgroundColor: '#7B68EE',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2d5016',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardCode: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  cardBody: {
    gap: 5,
  },
  cardInfo: {
    fontSize: 14,
    color: '#666',
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#2d5016',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  deadListHeader: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  deadListHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2d5016',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 32,
  },
});
