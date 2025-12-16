import React, { useState } from 'react';
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
import { usePlants } from '../hooks/usePlants';
import { Plant } from '../types';
import { formatDateLocal } from '../utils/date.utils';

type DeadPlantsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  navigation: DeadPlantsScreenNavigationProp;
};

export default function DeadPlantsScreen({ navigation }: Props) {
  const { plants, loading, error, refetch } = usePlants();
  const [refreshing, setRefreshing] = useState(false);

  const deadPlants = plants.filter(p => p.status === 'morta' || p.status === 'falha_germinacao');

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'morta': return 'Morta';
      case 'falha_germinacao': return 'Falha na Germinação';
      default: return status;
    }
  };

  const renderDeadPlantCard = ({ item }: { item: Plant }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PlantDetail', { id: item.id! })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.plantName}>{item.name}</Text>
          <Text style={styles.plantCode}>{item.code}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.status === 'falha_germinacao' ? styles.failureBadge : styles.deadBadge
        ]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
      
      {item.genetic_name && (
        <View style={styles.geneticRow}>
          <Text style={styles.geneticLabel}>Genética:</Text>
          <Text style={styles.geneticValue}>{item.genetic_name}</Text>
        </View>
      )}

      <View style={styles.datesRow}>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Plantio</Text>
          <Text style={styles.dateValue}>{formatDateLocal(item.planting_date)}</Text>
        </View>
        {item.failure_date && (
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Óbito</Text>
            <Text style={styles.dateValue}>{formatDateLocal(item.failure_date)}</Text>
          </View>
        )}
      </View>

      {item.failure_reason && (
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>Causa:</Text>
          <Text style={styles.reasonText}>{item.failure_reason}</Text>
        </View>
      )}
    </TouchableOpacity>
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

  if (deadPlants.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>🎉</Text>
        <Text style={styles.emptyText}>Nenhuma planta morta</Text>
        <Text style={styles.emptySubtext}>Todas as suas plantas estão saudáveis!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{deadPlants.length} plantas no memorial</Text>
      </View>
      <FlatList
        data={deadPlants}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={renderDeadPlantCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
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
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
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
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  plantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  plantCode: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deadBadge: {
    backgroundColor: '#fef2f2',
  },
  failureBadge: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991b1b',
  },
  geneticRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  geneticLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 6,
  },
  geneticValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7B68EE',
  },
  datesRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
  },
  dateItem: {},
  dateLabel: {
    fontSize: 11,
    color: '#999',
    textTransform: 'uppercase',
  },
  dateValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  reasonContainer: {
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  reasonLabel: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '600',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#7f1d1d',
  },
});
