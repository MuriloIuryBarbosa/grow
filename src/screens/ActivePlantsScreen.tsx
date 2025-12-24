import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { usePlants } from '../hooks/usePlants';
import { Plant } from '../types';
import PlantCard from '../components/PlantCard';

type ActivePlantsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  navigation: ActivePlantsScreenNavigationProp;
};

type PhaseFilter = 'todas' | 'germinacao' | 'muda' | 'vegetacao' | 'floracao';

export default function ActivePlantsScreen({ navigation }: Props) {
  const { plants, loading, error, refetch } = usePlants();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<PhaseFilter>('todas');

  const activePlants = plants.filter(p => p.status === 'ativa');

  const filteredPlants = useMemo(() => {
    if (selectedPhase === 'todas') {
      return activePlants;
    }
    return activePlants.filter(plant => plant.current_phase === selectedPhase);
  }, [activePlants, selectedPhase]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getPhaseLabel = (phase: PhaseFilter) => {
    switch (phase) {
      case 'todas': return 'Todas';
      case 'germinacao': return 'Germinação';
      case 'muda': return 'Muda';
      case 'vegetacao': return 'Vegetação';
      case 'floracao': return 'Floração';
      default: return phase;
    }
  };

  const getPhaseEmoji = (phase: PhaseFilter) => {
    switch (phase) {
      case 'todas': return '🌱';
      case 'germinacao': return '🌱';
      case 'muda': return '🌿';
      case 'vegetacao': return '🌳';
      case 'floracao': return '🌸';
      default: return '🌱';
    }
  };

  const getPhaseCount = (phase: PhaseFilter) => {
    if (phase === 'todas') return activePlants.length;
    return activePlants.filter(plant => plant.current_phase === phase).length;
  };

  const renderPlantCard = ({ item }: { item: Plant }) => (
    <PlantCard
      plant={item}
      onPress={() => navigation.navigate('PlantDetail', { id: item.id! })}
    />
  );

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
      </View>
    );
  }

  if (activePlants.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>🌱</Text>
        <Text style={styles.emptyText}>Nenhuma planta ativa</Text>
        <Text style={styles.emptySubtext}>Adicione uma nova planta para começar</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {filteredPlants.length} de {activePlants.length} plantas ativas
        </Text>
      </View>

      {/* Filtros por fase */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {(['todas', 'germinacao', 'muda', 'vegetacao', 'floracao'] as PhaseFilter[]).map((phase) => (
            <TouchableOpacity
              key={phase}
              style={[
                styles.filterButton,
                selectedPhase === phase && styles.filterButtonActive
              ]}
              onPress={() => setSelectedPhase(phase)}
            >
              <Text style={styles.filterEmoji}>{getPhaseEmoji(phase)}</Text>
              <Text style={[
                styles.filterText,
                selectedPhase === phase && styles.filterTextActive
              ]}>
                {getPhaseLabel(phase)}
              </Text>
              <Text style={[
                styles.filterCount,
                selectedPhase === phase && styles.filterCountActive
              ]}>
                {getPhaseCount(phase)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredPlants}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={renderPlantCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyFiltered}>
            <Text style={styles.emptyFilteredEmoji}>🔍</Text>
            <Text style={styles.emptyFilteredText}>
              Nenhuma planta na fase "{getPhaseLabel(selectedPhase)}"
            </Text>
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => setSelectedPhase('todas')}
            >
              <Text style={styles.clearFilterText}>Mostrar todas</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d5016',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
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
  },
  listContainer: {
    padding: 15,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filtersScroll: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#2d5016',
    borderColor: '#2d5016',
  },
  filterEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginRight: 6,
  },
  filterTextActive: {
    color: '#fff',
  },
  filterCount: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  filterCountActive: {
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  emptyFiltered: {
    alignItems: 'center',
    padding: 40,
  },
  emptyFilteredEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyFilteredText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  clearFilterButton: {
    backgroundColor: '#2d5016',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearFilterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
