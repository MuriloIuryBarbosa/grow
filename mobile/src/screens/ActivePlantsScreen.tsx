import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
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

export default function ActivePlantsScreen({ navigation }: Props) {
  const { plants, loading, error, refetch } = usePlants();
  const [refreshing, setRefreshing] = useState(false);

  const activePlants = plants.filter(p => p.status === 'ativa');

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
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
        <Text style={styles.headerTitle}>{activePlants.length} plantas ativas</Text>
      </View>
      <FlatList
        data={activePlants}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={renderPlantCard}
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
});
