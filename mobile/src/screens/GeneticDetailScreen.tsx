import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { GeneticStrain, SeedBatch, Plant } from '../types';
import { geneticsAPI, seedBatchesAPI, plantsAPI } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GeneticDetail'>;
  route: RouteProp<RootStackParamList, 'GeneticDetail'>;
};

export default function GeneticDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [genetic, setGenetic] = useState<GeneticStrain | null>(null);
  const [batches, setBatches] = useState<SeedBatch[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [geneticData, batchesData] = await Promise.all([
        geneticsAPI.getById(id),
        seedBatchesAPI.getByGenetic(id),
      ]);
      setGenetic(geneticData);
      setBatches(batchesData);

      // Buscar plantas relacionadas a esta genética
      const allPlants = await plantsAPI.getAll();
      const relatedPlants = allPlants.filter(
        (p: Plant) => p.genetic_strain_id === id
      );
      setPlants(relatedPlants);
    } catch (error) {
      console.error('Erro ao carregar genética:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da genética');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Genética',
      `Tem certeza que deseja excluir "${genetic?.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await geneticsAPI.delete(id);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert(
                'Erro',
                error.message || 'Não foi possível excluir a genética'
              );
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('NewGenetic', { editId: id });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2d5016" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!genetic) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Genética não encontrada</Text>
      </View>
    );
  }

  const totalSeeds = batches.reduce((acc, b) => acc + (b.current_quantity || 0), 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>🧬 {genetic.name}</Text>
          {genetic.type && (
            <View style={[styles.typeBadge, getTypeBadgeStyle(genetic.type)]}>
              <Text style={styles.typeBadgeText}>{formatType(genetic.type)}</Text>
            </View>
          )}
        </View>
        {genetic.breeder && (
          <Text style={styles.breeder}>🏷️ Breeder: {genetic.breeder}</Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{batches.length}</Text>
          <Text style={styles.statLabel}>Lotes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalSeeds}</Text>
          <Text style={styles.statLabel}>Sementes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{plants.length}</Text>
          <Text style={styles.statLabel}>Plantas</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Informações</Text>
        <View style={styles.detailsCard}>
          {genetic.flowering_time_min && genetic.flowering_time_max && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>⏱️ Tempo de Floração:</Text>
              <Text style={styles.detailValue}>
                {genetic.flowering_time_min} - {genetic.flowering_time_max} dias
              </Text>
            </View>
          )}
          {genetic.thc_content && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>🔥 THC:</Text>
              <Text style={styles.detailValue}>{genetic.thc_content}%</Text>
            </View>
          )}
          {genetic.cbd_content && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>💚 CBD:</Text>
              <Text style={styles.detailValue}>{genetic.cbd_content}%</Text>
            </View>
          )}
          {genetic.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.detailLabel}>📝 Descrição:</Text>
              <Text style={styles.description}>{genetic.description}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Seed Batches */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📦 Lotes de Sementes</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('NewSeedBatch', { geneticId: id })}
          >
            <Text style={styles.addButtonText}>+ Novo Lote</Text>
          </TouchableOpacity>
        </View>

        {batches.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhum lote cadastrado</Text>
          </View>
        ) : (
          batches.map((batch) => (
            <TouchableOpacity
              key={batch.id}
              style={styles.batchCard}
              onPress={() => navigation.navigate('SeedBatchDetail', { id: batch.id! })}
            >
              <View style={styles.batchHeader}>
                <Text style={styles.batchCode}>{batch.batch_code}</Text>
                <View style={[
                  styles.quantityBadge,
                  batch.current_quantity === 0 && styles.emptyBadge
                ]}>
                  <Text style={styles.quantityText}>
                    {batch.current_quantity} sementes
                  </Text>
                </View>
              </View>
              <View style={styles.batchDetails}>
                <Text style={styles.batchInfo}>
                  {getSeedTypeIcon(batch.seed_type)} {formatSeedType(batch.seed_type)}
                </Text>
                {batch.source && (
                  <Text style={styles.batchInfo}>🏪 {batch.source}</Text>
                )}
                <Text style={styles.batchInfo}>
                  📅 {formatDate(batch.acquisition_date)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Related Plants */}
      {plants.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌱 Plantas desta Genética</Text>
          {plants.map((plant) => (
            <TouchableOpacity
              key={plant.id}
              style={styles.plantCard}
              onPress={() => navigation.navigate('PlantDetail', { id: plant.id! })}
            >
              <Text style={styles.plantName}>🌱 {plant.name}</Text>
              <Text style={styles.plantCode}>{plant.code}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Text style={styles.editButtonText}>✏️ Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>🗑️ Excluir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
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

const formatDate = (dateStr?: string) => {
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
  errorText: {
    color: '#DC143C',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#2d5016',
    padding: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  breeder: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#2d5016',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  descriptionContainer: {
    paddingTop: 8,
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  batchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  batchCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  batchDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  batchInfo: {
    fontSize: 12,
    color: '#666',
  },
  plantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  plantCode: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#DC143C',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  spacer: {
    height: 40,
  },
});
