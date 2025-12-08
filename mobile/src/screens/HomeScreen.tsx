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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plants'>('dashboard');

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStats = () => {
    const stats = {
      total: plants.length,
      germinacao: plants.filter((p) => p.current_phase === 'germinacao').length,
      muda: plants.filter((p) => p.current_phase === 'muda').length,
      vegetacao: plants.filter((p) => p.current_phase === 'vegetacao').length,
      floracao: plants.filter((p) => p.current_phase === 'floracao').length,
      ativas: plants.filter((p) => p.status === 'ativa').length,
    };
    return stats;
  };

  const renderPlantCard = ({ item }: { item: Plant }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PlantDetail', { id: item.id! })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardCode}>{item.code}</Text>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.cardInfo}>
          <Text style={styles.label}>Fase:</Text> {PHASE_LABELS[item.current_phase]}
        </Text>
        <Text style={styles.cardInfo}>
          <Text style={styles.label}>Status:</Text> {STATUS_LABELS[item.status]}
        </Text>
        <Text style={styles.cardInfo}>
          <Text style={styles.label}>Plantio:</Text> {formatDateLocal(item.planting_date)}
        </Text>
        {item.germination_date && (
          <Text style={styles.cardInfo}>
            <Text style={styles.label}>Germinação:</Text> {formatDateLocal(item.germination_date)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
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

        <Text style={styles.sectionTitle}>Por Fase</Text>
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

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Sensors')}
          >
            <Text style={styles.buttonText}>🌡️ Sensores</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('RecordReading')}
          >
            <Text style={styles.buttonText}>📊 Registrar Leitura</Text>
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

    if (plants.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Nenhuma planta cadastrada</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={plants}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={renderPlantCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
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
            Plantas
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'dashboard' ? renderDashboard() : renderPlants()}

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
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#2d5016',
    fontWeight: 'bold',
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
