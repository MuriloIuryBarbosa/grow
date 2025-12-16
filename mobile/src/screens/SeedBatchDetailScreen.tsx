import React, { useState, useCallback } from 'react';
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
import { SeedBatch, Plant } from '../types';
import { seedBatchesAPI, plantsAPI } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SeedBatchDetail'>;
  route: RouteProp<RootStackParamList, 'SeedBatchDetail'>;
};

export default function SeedBatchDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [batch, setBatch] = useState<SeedBatch | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const batchData = await seedBatchesAPI.getById(id);
      setBatch(batchData);

      // Buscar plantas deste lote
      const allPlants = await plantsAPI.getAll();
      const batchPlants = allPlants.filter((p: Plant) => p.seed_batch_id === id);
      setPlants(batchPlants);
    } catch (error) {
      console.error('Erro ao carregar lote:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do lote');
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
      'Excluir Lote',
      `Tem certeza que deseja excluir o lote "${batch?.batch_code}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await seedBatchesAPI.delete(id);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível excluir o lote');
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('NewSeedBatch', { editId: id });
  };

  const handleGerminate = () => {
    if (!batch || batch.current_quantity === 0) {
      Alert.alert('Aviso', 'Não há sementes disponíveis neste lote');
      return;
    }

    Alert.alert(
      'Germinar Semente',
      `Deseja registrar uma germinação deste lote? (${batch.current_quantity} disponíveis)`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Germinar',
          onPress: async () => {
            try {
              await seedBatchesAPI.update(id, {
                current_quantity: batch.current_quantity - 1,
                seeds_germinated: (batch.seeds_germinated || 0) + 1,
              });
              Alert.alert('Sucesso', 'Germinação registrada! Não esqueça de cadastrar a nova planta.');
              loadData();
              // Navegar para criar nova planta
              navigation.navigate('NewPlant');
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível registrar a germinação');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2d5016" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!batch) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Lote não encontrado</Text>
      </View>
    );
  }

  const germinationRate = batch.initial_quantity > 0
    ? Math.round(((batch.seeds_germinated || 0) / batch.initial_quantity) * 100)
    : 0;

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
          <Text style={styles.title}>📦 {batch.batch_code}</Text>
          <View style={[
            styles.quantityBadge,
            batch.current_quantity === 0 && styles.emptyBadge
          ]}>
            <Text style={styles.quantityText}>{batch.current_quantity}</Text>
          </View>
        </View>
        {batch.genetic_name && (
          <TouchableOpacity
            onPress={() => batch.genetic_strain_id && navigation.navigate('GeneticDetail', { id: batch.genetic_strain_id })}
          >
            <Text style={styles.geneticLink}>🧬 {batch.genetic_name}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{batch.initial_quantity}</Text>
          <Text style={styles.statLabel}>Inicial</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{batch.seeds_germinated || 0}</Text>
          <Text style={styles.statLabel}>Germinadas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{batch.current_quantity}</Text>
          <Text style={styles.statLabel}>Disponíveis</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{germinationRate}%</Text>
          <Text style={styles.statLabel}>Taxa</Text>
        </View>
      </View>

      {/* Germinate Button */}
      {batch.current_quantity > 0 && (
        <TouchableOpacity style={styles.germinateButton} onPress={handleGerminate}>
          <Text style={styles.germinateButtonText}>🌱 Germinar Semente</Text>
        </TouchableOpacity>
      )}

      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Informações</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tipo de Semente:</Text>
            <Text style={styles.detailValue}>
              {getSeedTypeIcon(batch.seed_type)} {formatSeedType(batch.seed_type)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Data de Aquisição:</Text>
            <Text style={styles.detailValue}>{formatDate(batch.acquisition_date)}</Text>
          </View>
          {batch.source && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fonte:</Text>
              <Text style={styles.detailValue}>🏪 {batch.source}</Text>
            </View>
          )}
          {batch.price && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Preço:</Text>
              <Text style={styles.detailValue}>💰 R$ {batch.price.toFixed(2)}</Text>
            </View>
          )}
          {batch.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.detailLabel}>📝 Notas:</Text>
              <Text style={styles.notes}>{batch.notes}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Plants from this batch */}
      {plants.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌱 Plantas deste Lote ({plants.length})</Text>
          {plants.map((plant) => (
            <TouchableOpacity
              key={plant.id}
              style={styles.plantCard}
              onPress={() => navigation.navigate('PlantDetail', { id: plant.id! })}
            >
              <View>
                <Text style={styles.plantName}>🌱 {plant.name}</Text>
                <Text style={styles.plantCode}>{plant.code}</Text>
              </View>
              <View style={[styles.phaseBadge, getPhaseStyle(plant.current_phase)]}>
                <Text style={styles.phaseBadgeText}>{formatPhase(plant.current_phase)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Progress Bar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Uso do Lote</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                styles.germinatedFill,
                { width: `${(batch.seeds_germinated || 0) / batch.initial_quantity * 100}%` }
              ]}
            />
            <View
              style={[
                styles.progressFill,
                styles.availableFill,
                {
                  width: `${batch.current_quantity / batch.initial_quantity * 100}%`,
                  left: `${(batch.seeds_germinated || 0) / batch.initial_quantity * 100}%`
                }
              ]}
            />
          </View>
          <View style={styles.progressLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Germinadas ({batch.seeds_germinated || 0})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.legendText}>Disponíveis ({batch.current_quantity})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#e0e0e0' }]} />
              <Text style={styles.legendText}>
                Usadas ({batch.initial_quantity - batch.current_quantity - (batch.seeds_germinated || 0)})
              </Text>
            </View>
          </View>
        </View>
      </View>

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

const formatPhase = (phase?: string) => {
  const phases: Record<string, string> = {
    germination: 'Germinação',
    seedling: 'Muda',
    vegetative: 'Vegetativo',
    flowering: 'Floração',
    drying: 'Secagem',
    curing: 'Cura',
    harvested: 'Colhida',
  };
  return phases[phase || ''] || phase || 'N/A';
};

const getPhaseStyle = (phase?: string) => {
  const colors: Record<string, string> = {
    germination: '#8B4513',
    seedling: '#90EE90',
    vegetative: '#228B22',
    flowering: '#FF69B4',
    drying: '#DEB887',
    curing: '#CD853F',
    harvested: '#FFD700',
  };
  return { backgroundColor: colors[phase || ''] || '#808080' };
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
  quantityBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  emptyBadge: {
    backgroundColor: '#DC143C',
  },
  quantityText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  geneticLink: {
    fontSize: 14,
    color: '#90EE90',
    marginTop: 8,
    textDecorationLine: 'underline',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  germinateButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  germinateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
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
  notesContainer: {
    paddingTop: 8,
  },
  notes: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    lineHeight: 20,
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
    marginTop: 2,
  },
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  phaseBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  progressContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  progressBar: {
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    position: 'absolute',
    top: 0,
  },
  germinatedFill: {
    backgroundColor: '#4CAF50',
    left: 0,
  },
  availableFill: {
    backgroundColor: '#2196F3',
  },
  progressLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
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
