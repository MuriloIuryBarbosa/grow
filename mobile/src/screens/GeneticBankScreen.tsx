import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { GeneticStrain, SeedBatch, Clone } from '../types';
import { geneticsAPI, seedBatchesAPI, clonesAPI, geneticBankAPI } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GeneticBank'>;
};

type TabType = 'genetics' | 'batches' | 'clones';

export default function GeneticBankScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('genetics');
  const [genetics, setGenetics] = useState<GeneticStrain[]>([]);
  const [batches, setBatches] = useState<SeedBatch[]>([]);
  const [clones, setClones] = useState<Clone[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [geneticsData, batchesData, clonesData, statsData] = await Promise.all([
        geneticsAPI.getAll(true),
        seedBatchesAPI.getAll({ activeOnly: true }),
        clonesAPI.getAll(),
        geneticBankAPI.getStats(),
      ]);
      setGenetics(geneticsData);
      setBatches(batchesData);
      setClones(clonesData);
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do banco genético');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.total_genetics || 0}</Text>
          <Text style={styles.statLabel}>Genéticas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.total_batches || 0}</Text>
          <Text style={styles.statLabel}>Lotes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.total_seeds_available || 0}</Text>
          <Text style={styles.statLabel}>Sementes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.clones?.total || 0}</Text>
          <Text style={styles.statLabel}>Clones</Text>
        </View>
      </View>
    </View>
  );

  const renderGeneticItem = ({ item }: { item: GeneticStrain }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('GeneticDetail', { id: item.id! })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>🧬 {item.name}</Text>
        {item.type && (
          <View style={[styles.typeBadge, getTypeBadgeStyle(item.type)]}>
            <Text style={styles.typeBadgeText}>{formatType(item.type)}</Text>
          </View>
        )}
      </View>
      {item.breeder && (
        <Text style={styles.cardSubtitle}>🏷️ {item.breeder}</Text>
      )}
      <View style={styles.cardStats}>
        <Text style={styles.cardStat}>🌱 {item.total_seeds || 0} sementes</Text>
        <Text style={styles.cardStat}>🌿 {item.total_plants || 0} plantas</Text>
      </View>
      {item.flowering_time_min && item.flowering_time_max && (
        <Text style={styles.cardInfo}>
          ⏱️ Floração: {item.flowering_time_min}-{item.flowering_time_max} dias
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderBatchItem = ({ item }: { item: SeedBatch }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('SeedBatchDetail', { id: item.id! })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>📦 {item.batch_code}</Text>
        <View style={[styles.quantityBadge, item.current_quantity === 0 && styles.emptyBadge]}>
          <Text style={styles.quantityText}>{item.current_quantity}</Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>🧬 {item.genetic_name || 'Genética não definida'}</Text>
      <View style={styles.cardStats}>
        <Text style={styles.cardStat}>
          {getSeedTypeIcon(item.seed_type)} {formatSeedType(item.seed_type)}
        </Text>
        <Text style={styles.cardStat}>📅 {formatDate(item.acquisition_date)}</Text>
      </View>
      {item.source && (
        <Text style={styles.cardInfo}>🏪 {item.source}</Text>
      )}
    </TouchableOpacity>
  );

  const renderCloneItem = ({ item }: { item: Clone }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PlantDetail', { id: item.mother_plant_id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>🌿 {item.clone_code}</Text>
        <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
          <Text style={styles.statusText}>{formatCloneStatus(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>
        👩‍🌾 Mãe: {item.mother_plant_name || item.mother_plant_code || 'N/A'}
      </Text>
      <View style={styles.cardStats}>
        <Text style={styles.cardStat}>✂️ Corte: {formatDate(item.cut_date)}</Text>
        {item.rooting_date && (
          <Text style={styles.cardStat}>🌱 Raiz: {formatDate(item.rooting_date)}</Text>
        )}
      </View>
      {item.days_to_root && (
        <Text style={styles.cardInfo}>⏱️ {item.days_to_root} dias para enraizar</Text>
      )}
    </TouchableOpacity>
  );

  const getAddButtonConfig = () => {
    switch (activeTab) {
      case 'genetics':
        return { label: 'Nova Genética', onPress: () => navigation.navigate('NewGenetic', {}) };
      case 'batches':
        return { label: 'Novo Lote', onPress: () => navigation.navigate('NewSeedBatch', {}) };
      case 'clones':
        return { label: 'Novo Clone', onPress: () => navigation.navigate('NewClone', {}) };
    }
  };

  const addButton = getAddButtonConfig();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2d5016" />
        <Text style={styles.loadingText}>Carregando banco genético...</Text>
      </View>
    );
  }

  const renderContent = () => {
    const emptyMessage = activeTab === 'genetics' 
      ? 'Nenhuma genética cadastrada'
      : activeTab === 'batches' 
        ? 'Nenhum lote de sementes'
        : 'Nenhum clone registrado';

    const EmptyComponent = (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={addButton.onPress}>
          <Text style={styles.emptyButtonText}>+ {addButton.label}</Text>
        </TouchableOpacity>
      </View>
    );

    switch (activeTab) {
      case 'genetics':
        return (
          <FlatList
            data={genetics}
            keyExtractor={(item) => item.id!.toString()}
            renderItem={renderGeneticItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.list}
            ListEmptyComponent={EmptyComponent}
          />
        );
      case 'batches':
        return (
          <FlatList
            data={batches}
            keyExtractor={(item) => item.id!.toString()}
            renderItem={renderBatchItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.list}
            ListEmptyComponent={EmptyComponent}
          />
        );
      case 'clones':
        return (
          <FlatList
            data={clones}
            keyExtractor={(item) => item.id!.toString()}
            renderItem={renderCloneItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.list}
            ListEmptyComponent={EmptyComponent}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderStats()}
      
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'genetics' && styles.activeTab]}
          onPress={() => setActiveTab('genetics')}
        >
          <Text style={[styles.tabText, activeTab === 'genetics' && styles.activeTabText]}>
            🧬 Genéticas ({genetics.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'batches' && styles.activeTab]}
          onPress={() => setActiveTab('batches')}
        >
          <Text style={[styles.tabText, activeTab === 'batches' && styles.activeTabText]}>
            📦 Lotes ({batches.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'clones' && styles.activeTab]}
          onPress={() => setActiveTab('clones')}
        >
          <Text style={[styles.tabText, activeTab === 'clones' && styles.activeTabText]}>
            🌿 Clones ({clones.length})
          </Text>
        </TouchableOpacity>
      </View>

      {renderContent()}

      <TouchableOpacity style={styles.fab} onPress={addButton.onPress}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// Helper functions
const formatType = (type: string) => {
  const types: Record<string, string> = {
    indica: 'Indica',
    sativa: 'Sativa',
    hybrid: 'Híbrida',
    ruderalis: 'Ruderalis',
    unknown: 'Desconhecida',
  };
  return types[type] || type;
};

const getTypeBadgeStyle = (type: string) => {
  const colors: Record<string, string> = {
    indica: '#7B68EE',
    sativa: '#FFD700',
    hybrid: '#32CD32',
    ruderalis: '#A9A9A9',
    unknown: '#808080',
  };
  return { backgroundColor: colors[type] || '#808080' };
};

const formatSeedType = (type?: string) => {
  const types: Record<string, string> = {
    regular: 'Regular',
    feminized: 'Feminizada',
    autoflower: 'Automática',
    cbd: 'CBD',
    unknown: 'Desconhecido',
  };
  return types[type || 'unknown'] || type;
};

const getSeedTypeIcon = (type?: string) => {
  const icons: Record<string, string> = {
    regular: '🔄',
    feminized: '♀️',
    autoflower: '⚡',
    cbd: '💚',
    unknown: '❓',
  };
  return icons[type || 'unknown'] || '🌱';
};

const formatCloneStatus = (status: string) => {
  const statuses: Record<string, string> = {
    cutting: 'Cortado',
    rooting: 'Enraizando',
    rooted: 'Enraizado',
    planted: 'Plantado',
    failed: 'Falhou',
    discarded: 'Descartado',
  };
  return statuses[status] || status;
};

const getStatusBadgeStyle = (status: string) => {
  const colors: Record<string, string> = {
    cutting: '#9E9E9E',
    rooting: '#FFA500',
    rooted: '#32CD32',
    planted: '#4169E1',
    failed: '#DC143C',
    discarded: '#808080',
  };
  return { backgroundColor: colors[status] || '#808080' };
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  statsContainer: {
    backgroundColor: '#2d5016',
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2d5016',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
  },
  activeTabText: {
    color: '#2d5016',
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  cardStat: {
    fontSize: 12,
    color: '#888',
  },
  cardInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  quantityBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyBadge: {
    backgroundColor: '#DC143C',
  },
  quantityText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#2d5016',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2d5016',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
  },
});
