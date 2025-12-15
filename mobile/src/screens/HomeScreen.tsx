import React, { useState } from 'react';
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

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
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
        </View>

        {/* Card de Plantas Mortas */}
        {stats.mortas > 0 && (
          <TouchableOpacity 
            style={styles.deadCard}
            onPress={() => setActiveTab('dead')}
          >
            <View style={styles.deadCardContent}>
              <Text style={styles.deadCardIcon}>💀</Text>
              <View style={styles.deadCardInfo}>
                <Text style={styles.deadCardValue}>{stats.mortas}</Text>
                <Text style={styles.deadCardLabel}>
                  {stats.mortas === 1 ? 'Planta Morta' : 'Plantas Mortas'}
                </Text>
              </View>
              <Text style={styles.deadCardArrow}>›</Text>
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Por Fase (Ativas)</Text>
        <View style={styles.phaseGrid}>
          <View style={[styles.phaseCard, styles.germinacaoCard]}>
            <Text style={styles.phaseEmoji}>🌱</Text>
            <Text style={styles.phaseValue}>{stats.germinacao}</Text>
            <Text style={styles.phaseLabel}>Germinação</Text>
          </View>
          <View style={[styles.phaseCard, styles.mudaCard]}>
            <Text style={styles.phaseEmoji}>🌿</Text>
            <Text style={styles.phaseValue}>{stats.muda}</Text>
            <Text style={styles.phaseLabel}>Muda</Text>
          </View>
          <View style={[styles.phaseCard, styles.vegetacaoCard]}>
            <Text style={styles.phaseEmoji}>🌳</Text>
            <Text style={styles.phaseValue}>{stats.vegetacao}</Text>
            <Text style={styles.phaseLabel}>Vegetação</Text>
          </View>
          <View style={[styles.phaseCard, styles.floracaoCard]}>
            <Text style={styles.phaseEmoji}>🌸</Text>
            <Text style={styles.phaseValue}>{stats.floracao}</Text>
            <Text style={styles.phaseLabel}>Floração</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>📊 Dados dos Sensores</Text>
        <SensorDashboard />

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Sensors')}
          >
            <Text style={styles.buttonText}>🌡️ Gerenciar Sensores</Text>
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
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>
            Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'plants' && styles.activeTab]}
          onPress={() => setActiveTab('plants')}
        >
          <Text style={[styles.tabText, activeTab === 'plants' && styles.activeTabText]}>
            Ativas ({activePlants.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dead' && styles.activeTab, activeTab === 'dead' && styles.deadTab]}
          onPress={() => setActiveTab('dead')}
        >
          <Text style={[styles.tabText, activeTab === 'dead' && styles.activeTabText, activeTab === 'dead' && styles.deadTabText]}>
            💀 Mortas ({deadPlants.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'dashboard' ? renderDashboard() : activeTab === 'plants' ? renderPlants() : renderDeadPlants()}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewPlant')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  deadCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  deadCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadCardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  deadCardInfo: {
    flex: 1,
  },
  deadCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  deadCardLabel: {
    fontSize: 14,
    color: '#991b1b',
  },
  deadCardArrow: {
    fontSize: 24,
    color: '#dc2626',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
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
  phaseEmoji: { fontSize: 32, marginBottom: 5 },
  phaseValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  phaseLabel: { fontSize: 12, color: '#666', marginTop: 5 },
  actionButtons: {
    gap: 10,
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
