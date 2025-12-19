import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { seedBatchesAPI } from '../services/api';
import { SeedBatch } from '../types';

type BatchGerminationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  navigation: BatchGerminationScreenNavigationProp;
};

const SUBSTRATES = [
  'Terra vegetal',
  'Coco',
  'Perlita',
  'Vermiculita',
  'Hidroponia',
  'Aeroponia',
  'Mix personalizado',
  'Outro',
];

export default function BatchGerminationScreen({ navigation }: Props) {
  const [seedBatches, setSeedBatches] = useState<SeedBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<SeedBatch | null>(null);
  const [showGerminationModal, setShowGerminationModal] = useState(false);
  const [germinationData, setGerminationData] = useState({
    quantity: '',
    substrate: 'Terra vegetal',
    substrate_other: '',
    location: '',
    notes: '',
  });

  useEffect(() => {
    loadSeedBatches();
  }, []);

  const loadSeedBatches = async () => {
    try {
      const batches = await seedBatchesAPI.getAll({ availableOnly: true });
      setSeedBatches(batches);
    } catch (error) {
      console.error('Erro ao carregar lotes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os lotes de sementes');
    } finally {
      setLoading(false);
    }
  };

  const handleGerminate = async () => {
    if (!selectedBatch) return;

    const quantity = parseInt(germinationData.quantity);
    if (!quantity || quantity <= 0) {
      Alert.alert('Erro', 'Quantidade deve ser maior que 0');
      return;
    }

    if (quantity > selectedBatch.current_quantity) {
      Alert.alert('Erro', `Lote tem apenas ${selectedBatch.current_quantity} sementes disponíveis`);
      return;
    }

    if (!germinationData.substrate) {
      Alert.alert('Erro', 'Selecione o substrato');
      return;
    }

    if (germinationData.substrate === 'Outro' && !germinationData.substrate_other?.trim()) {
      Alert.alert('Erro', 'Especifique o substrato');
      return;
    }

    setLoading(true);
    try {
      const response = await seedBatchesAPI.germinate(selectedBatch.id!, {
        quantity,
        substrate: germinationData.substrate === 'Outro' ? germinationData.substrate_other : germinationData.substrate,
        substrate_other: germinationData.substrate === 'Outro' ? null : germinationData.substrate_other,
        location: germinationData.location || null,
        notes: germinationData.notes || null,
      });

      Alert.alert(
        'Sucesso',
        `${quantity} plantas criadas com sucesso do lote ${selectedBatch.batch_code}!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowGerminationModal(false);
              setSelectedBatch(null);
              setGerminationData({
                quantity: '',
                substrate: 'Terra vegetal',
                substrate_other: '',
                location: '',
                notes: '',
              });
              loadSeedBatches(); // Recarregar para atualizar quantidades
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Erro ao germinar:', error);
      Alert.alert('Erro', error.response?.data?.error || 'Não foi possível germinar as sementes');
    } finally {
      setLoading(false);
    }
  };

  const renderSeedBatch = ({ item }: { item: SeedBatch }) => (
    <View style={styles.batchCard}>
      <View style={styles.batchHeader}>
        <Text style={styles.batchCode}>{item.batch_code}</Text>
        <View style={styles.quantityBadge}>
          <Text style={styles.quantityText}>{item.current_quantity} disponíveis</Text>
        </View>
      </View>

      <Text style={styles.geneticName}>{item.genetic_name}</Text>
      <Text style={styles.breeder}>{item.genetic_breeder || 'Breeder não informado'}</Text>

      <View style={styles.batchInfo}>
        <Text style={styles.batchInfoText}>
          Tipo: {item.seed_type || 'Regular'}
        </Text>
        <Text style={styles.batchInfoText}>
          Origem: {item.source}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.germinateButton, item.current_quantity === 0 && styles.germinateButtonDisabled]}
        onPress={() => {
          if (item.current_quantity > 0) {
            setSelectedBatch(item);
            setShowGerminationModal(true);
          }
        }}
        disabled={item.current_quantity === 0}
      >
        <Text style={[styles.germinateButtonText, item.current_quantity === 0 && styles.germinateButtonTextDisabled]}>
          🌱 Germinar Sementes
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && seedBatches.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Carregando lotes de sementes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🌱</Text>
        <Text style={styles.headerTitle}>Germinação em Lote</Text>
        <Text style={styles.headerSubtitle}>Selecione um lote e germine múltiplas sementes</Text>
      </View>

      {seedBatches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🌰</Text>
          <Text style={styles.emptyTitle}>Nenhum lote disponível</Text>
          <Text style={styles.emptyText}>
            Não há lotes de sementes com quantidade disponível para germinação.
          </Text>
        </View>
      ) : (
        <FlatList
          data={seedBatches}
          renderItem={renderSeedBatch}
          keyExtractor={(item) => item.id!.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal de Germinação */}
      <Modal
        visible={showGerminationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGerminationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Germinar Sementes</Text>
              <TouchableOpacity
                onPress={() => setShowGerminationModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedBatch && (
              <View style={styles.selectedBatchInfo}>
                <Text style={styles.selectedBatchCode}>{selectedBatch.batch_code}</Text>
                <Text style={styles.selectedBatchGenetic}>{selectedBatch.genetic_name}</Text>
                <Text style={styles.selectedBatchAvailable}>
                  {selectedBatch.current_quantity} sementes disponíveis
                </Text>
              </View>
            )}

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {/* Quantidade */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quantidade de Sementes *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 5"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={germinationData.quantity}
                  onChangeText={(text) => setGerminationData(prev => ({ ...prev, quantity: text }))}
                />
              </View>

              {/* Substrato */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Substrato *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.substrateScroll}>
                  {SUBSTRATES.map((substrate) => (
                    <TouchableOpacity
                      key={substrate}
                      style={[styles.substrateOption, germinationData.substrate === substrate && styles.substrateOptionSelected]}
                      onPress={() => setGerminationData(prev => ({ ...prev, substrate }))}
                    >
                      <Text style={[styles.substrateOptionText, germinationData.substrate === substrate && styles.substrateOptionTextSelected]}>
                        {substrate}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {germinationData.substrate === 'Outro' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Especificar Substrato *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Descreva o substrato"
                    placeholderTextColor="#999"
                    value={germinationData.substrate_other}
                    onChangeText={(text) => setGerminationData(prev => ({ ...prev, substrate_other: text }))}
                  />
                </View>
              )}

              {/* Localização */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Localização</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Estufa A, Bancada 2"
                  placeholderTextColor="#999"
                  value={germinationData.location}
                  onChangeText={(text) => setGerminationData(prev => ({ ...prev, location: text }))}
                />
              </View>

              {/* Notas */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notas</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Observações sobre a germinação"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  value={germinationData.notes}
                  onChangeText={(text) => setGerminationData(prev => ({ ...prev, notes: text }))}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowGerminationModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleGerminate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>🌱 Germinar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    padding: 15,
  },
  batchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  batchCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  quantityBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quantityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  geneticName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  breeder: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
  },
  batchInfo: {
    marginBottom: 15,
  },
  batchInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  germinateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  germinateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  germinateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  germinateButtonTextDisabled: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  selectedBatchInfo: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedBatchCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedBatchGenetic: {
    fontSize: 16,
    color: '#666',
    marginTop: 2,
  },
  selectedBatchAvailable: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
  },
  modalScrollView: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  substrateScroll: {
    marginBottom: 10,
  },
  substrateOption: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  substrateOptionSelected: {
    backgroundColor: '#4CAF50',
  },
  substrateOptionText: {
    fontSize: 14,
    color: '#666',
  },
  substrateOptionTextSelected: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});