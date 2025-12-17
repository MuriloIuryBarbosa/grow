import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { plantsAPI, seedBatchesAPI } from '../services/api';
import { Plant, SeedBatch } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'NewPlant'>;

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

const PHASES = [
  { value: 'germinacao', label: '🌱 Germinação', description: 'Semente acabou de brotar' },
  { value: 'muda', label: '🌿 Muda', description: 'Primeiras folhas verdadeiras' },
  { value: 'vegetacao', label: '🌳 Vegetação', description: 'Crescimento vegetativo' },
  { value: 'floracao', label: '🌸 Floração', description: 'Fase de floração' },
];

export default function NewPlantScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [seedBatches, setSeedBatches] = useState<SeedBatch[]>([]);
  const [loadingSeedBatches, setLoadingSeedBatches] = useState(true);
  const [showSeedBatchModal, setShowSeedBatchModal] = useState(false);
  const [selectedSeedBatch, setSelectedSeedBatch] = useState<SeedBatch | null>(null);
  const [formData, setFormData] = useState<Partial<Plant>>({
    name: '',
    genetic: '',
    code: '',
    planting_date: new Date().toISOString().split('T')[0],
    germination_date: '',
    substrate: '',
    substrate_other: '',
    current_phase: 'germinacao',
    current_location: '',
    status: 'ativa',
    seed_batch_id: undefined,
    origin_type: 'unknown',
  });
  const [showSubstrateOptions, setShowSubstrateOptions] = useState(false);
  const [showPhaseOptions, setShowPhaseOptions] = useState(false);

  // Carregar lotes de sementes disponíveis
  useEffect(() => {
    const loadSeedBatches = async () => {
      try {
        const batches = await seedBatchesAPI.getAll({ availableOnly: true });
        setSeedBatches(batches);
      } catch (error) {
        console.error('Erro ao carregar lotes de sementes:', error);
      } finally {
        setLoadingSeedBatches(false);
      }
    };
    loadSeedBatches();
  }, []);

  // Quando selecionar um lote de sementes, auto-preencher genética
  const handleSeedBatchSelect = (batch: SeedBatch | null) => {
    setSelectedSeedBatch(batch);
    setShowSeedBatchModal(false);
    
    if (batch) {
      setFormData(prev => ({
        ...prev,
        seed_batch_id: batch.id,
        origin_type: 'seed',
        genetic: batch.genetic_name || prev.genetic,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        seed_batch_id: undefined,
        origin_type: 'unknown',
      }));
    }
  };

  const updateField = (field: keyof Plant, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.name?.trim()) {
      Alert.alert('Erro', 'O nome da planta é obrigatório');
      return false;
    }
    if (!formData.code?.trim()) {
      Alert.alert('Erro', 'O código/identificador é obrigatório');
      return false;
    }
    if (!formData.substrate) {
      Alert.alert('Erro', 'Selecione o substrato');
      return false;
    }
    if (formData.substrate === 'Outro' && !formData.substrate_other?.trim()) {
      Alert.alert('Erro', 'Especifique o substrato');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const plantData: Partial<Plant> = {
        ...formData,
        substrate: formData.substrate === 'Outro' ? formData.substrate_other : formData.substrate,
      };

      // Remover campos vazios
      if (!plantData.genetic?.trim()) delete plantData.genetic;
      if (!plantData.germination_date?.trim()) delete plantData.germination_date;
      if (!plantData.current_location?.trim()) delete plantData.current_location;
      delete plantData.substrate_other;

      await plantsAPI.create(plantData);
      Alert.alert('Sucesso', 'Planta criada com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Erro ao criar planta:', error);
      if (error.response?.status === 409) {
        Alert.alert('Erro', 'Já existe uma planta com este código');
      } else {
        Alert.alert('Erro', 'Não foi possível criar a planta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDateInput = (text: string): string => {
    // Remove tudo que não é número
    const numbers = text.replace(/\D/g, '');
    
    // Formata como YYYY-MM-DD
    if (numbers.length <= 4) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    } else {
      return `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 8)}`;
    }
  };

  const getPhaseLabel = (phase: string) => {
    return PHASES.find(p => p.value === phase)?.label || phase;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🌱</Text>
          <Text style={styles.headerTitle}>Nova Planta</Text>
          <Text style={styles.headerSubtitle}>Preencha os dados da sua nova planta</Text>
        </View>

        {/* Nome da Planta */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome da Planta *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Minha Planta #1"
            placeholderTextColor="#999"
            value={formData.name}
            onChangeText={(text) => updateField('name', text)}
          />
        </View>

        {/* Código/Identificador */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Código/Identificador *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: VASO01, P001"
            placeholderTextColor="#999"
            value={formData.code}
            onChangeText={(text) => updateField('code', text.toUpperCase())}
            autoCapitalize="characters"
          />
          <Text style={styles.hint}>Identificador único para a planta</Text>
        </View>

        {/* Lote de Sementes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>🌱 Lote de Sementes</Text>
          <TouchableOpacity
            style={[styles.selectButton, selectedSeedBatch && styles.selectButtonSelected]}
            onPress={() => setShowSeedBatchModal(true)}
            disabled={loadingSeedBatches}
          >
            {loadingSeedBatches ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <>
                <View style={styles.seedBatchSelectContent}>
                  {selectedSeedBatch ? (
                    <>
                      <Text style={styles.seedBatchSelectCode}>{selectedSeedBatch.batch_code}</Text>
                      <Text style={styles.seedBatchSelectGenetic}>
                        {selectedSeedBatch.genetic_name || 'Genética não especificada'}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.selectButtonPlaceholder}>
                      Selecionar lote de sementes (opcional)
                    </Text>
                  )}
                </View>
                <Text style={styles.selectArrow}>▼</Text>
              </>
            )}
          </TouchableOpacity>
          {selectedSeedBatch && (
            <TouchableOpacity
              style={styles.clearSeedBatchButton}
              onPress={() => handleSeedBatchSelect(null)}
            >
              <Text style={styles.clearSeedBatchText}>✕ Remover seleção</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.hint}>
            Vincule a planta a um lote do banco de sementes
          </Text>
        </View>

        {/* Genética */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Genética/Variedade</Text>
          <TextInput
            style={[styles.input, selectedSeedBatch && styles.inputDisabled]}
            placeholder="Ex: Indica, Sativa, Híbrido..."
            placeholderTextColor="#999"
            value={formData.genetic}
            onChangeText={(text) => updateField('genetic', text)}
            editable={!selectedSeedBatch}
          />
          {selectedSeedBatch && (
            <Text style={styles.hintSuccess}>
              ✓ Preenchido automaticamente pelo lote de sementes
            </Text>
          )}
        </View>

        {/* Data de Plantio */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Data de Plantio *</Text>
          <TextInput
            style={styles.input}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#999"
            value={formData.planting_date}
            onChangeText={(text) => updateField('planting_date', formatDateInput(text))}
            keyboardType="numeric"
            maxLength={10}
          />
          <Text style={styles.hint}>Formato: 2024-12-15</Text>
        </View>

        {/* Data de Germinação */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Data de Germinação</Text>
          <TextInput
            style={styles.input}
            placeholder="AAAA-MM-DD (opcional)"
            placeholderTextColor="#999"
            value={formData.germination_date}
            onChangeText={(text) => updateField('germination_date', formatDateInput(text))}
            keyboardType="numeric"
            maxLength={10}
          />
          <Text style={styles.hint}>Quando a semente brotou</Text>
        </View>

        {/* Substrato */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Substrato *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowSubstrateOptions(!showSubstrateOptions)}
          >
            <Text style={formData.substrate ? styles.selectButtonText : styles.selectButtonPlaceholder}>
              {formData.substrate || 'Selecione o substrato'}
            </Text>
            <Text style={styles.selectArrow}>{showSubstrateOptions ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          
          {showSubstrateOptions && (
            <View style={styles.optionsContainer}>
              {SUBSTRATES.map((substrate) => (
                <TouchableOpacity
                  key={substrate}
                  style={[
                    styles.optionButton,
                    formData.substrate === substrate && styles.optionButtonSelected,
                  ]}
                  onPress={() => {
                    updateField('substrate', substrate);
                    setShowSubstrateOptions(false);
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    formData.substrate === substrate && styles.optionTextSelected,
                  ]}>
                    {substrate}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {formData.substrate === 'Outro' && (
            <TextInput
              style={[styles.input, styles.inputMarginTop]}
              placeholder="Especifique o substrato"
              placeholderTextColor="#999"
              value={formData.substrate_other}
              onChangeText={(text) => updateField('substrate_other', text)}
            />
          )}
        </View>

        {/* Fase Atual */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fase Atual *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowPhaseOptions(!showPhaseOptions)}
          >
            <Text style={styles.selectButtonText}>
              {getPhaseLabel(formData.current_phase || 'germinacao')}
            </Text>
            <Text style={styles.selectArrow}>{showPhaseOptions ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          
          {showPhaseOptions && (
            <View style={styles.optionsContainer}>
              {PHASES.map((phase) => (
                <TouchableOpacity
                  key={phase.value}
                  style={[
                    styles.optionButton,
                    styles.phaseOption,
                    formData.current_phase === phase.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => {
                    updateField('current_phase', phase.value);
                    setShowPhaseOptions(false);
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    formData.current_phase === phase.value && styles.optionTextSelected,
                  ]}>
                    {phase.label}
                  </Text>
                  <Text style={[
                    styles.phaseDescription,
                    formData.current_phase === phase.value && styles.phaseDescriptionSelected,
                  ]}>
                    {phase.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Localização */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Localização</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Grow Tent 1, Varanda, Indoor..."
            placeholderTextColor="#999"
            value={formData.current_location}
            onChangeText={(text) => updateField('current_location', text)}
          />
        </View>

        {/* Botões */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>🌱 Criar Planta</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Modal de Seleção de Lote de Sementes */}
      <Modal
        visible={showSeedBatchModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSeedBatchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🌱 Selecionar Lote de Sementes</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSeedBatchModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {seedBatches.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>🌱</Text>
                  <Text style={styles.emptyStateText}>
                    Nenhum lote de sementes disponível
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    Cadastre sementes no Banco Genético
                  </Text>
                </View>
              ) : (
                seedBatches.map((batch) => (
                  <TouchableOpacity
                    key={batch.id}
                    style={[
                      styles.seedBatchItem,
                      selectedSeedBatch?.id === batch.id && styles.seedBatchItemSelected,
                    ]}
                    onPress={() => handleSeedBatchSelect(batch)}
                  >
                    <View style={styles.seedBatchItemContent}>
                      <View style={styles.seedBatchItemHeader}>
                        <Text style={styles.seedBatchItemCode}>{batch.batch_code}</Text>
                        <View style={styles.seedBatchQuantityBadge}>
                          <Text style={styles.seedBatchQuantityText}>
                            {batch.current_quantity} disponíveis
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.seedBatchItemGenetic}>
                        {batch.genetic_name || 'Genética não especificada'}
                      </Text>
                      {batch.breeder && (
                        <Text style={styles.seedBatchItemBreeder}>
                          Breeder: {batch.breeder}
                        </Text>
                      )}
                      {batch.seed_type && (
                        <Text style={styles.seedBatchItemType}>
                          Tipo: {batch.seed_type === 'feminized' ? 'Feminizada' :
                                 batch.seed_type === 'autoflower' ? 'Automática' :
                                 batch.seed_type === 'regular' ? 'Regular' :
                                 batch.seed_type === 'cbd' ? 'CBD' : batch.seed_type}
                        </Text>
                      )}
                    </View>
                    {selectedSeedBatch?.id === batch.id && (
                      <Text style={styles.seedBatchItemCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 16,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  inputGroup: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  inputMarginTop: {
    marginTop: 10,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginLeft: 4,
  },
  selectButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#333',
  },
  selectButtonPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  selectArrow: {
    fontSize: 12,
    color: '#666',
  },
  optionsContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  optionButton: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionButtonSelected: {
    backgroundColor: '#e8f5e9',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#2d5016',
    fontWeight: '600',
  },
  phaseOption: {
    paddingVertical: 12,
  },
  phaseDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  phaseDescriptionSelected: {
    color: '#4a7c23',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#2d5016',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
  // Estilos para Seleção de Lote de Sementes
  selectButtonSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0fff0',
  },
  seedBatchSelectContent: {
    flex: 1,
  },
  seedBatchSelectCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d5016',
  },
  seedBatchSelectGenetic: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  clearSeedBatchButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearSeedBatchText: {
    fontSize: 13,
    color: '#e53935',
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  hintSuccess: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    marginLeft: 4,
  },
  // Estilos do Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 20,
    color: '#666',
  },
  modalList: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  seedBatchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  seedBatchItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  seedBatchItemContent: {
    flex: 1,
  },
  seedBatchItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  seedBatchItemCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  seedBatchQuantityBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  seedBatchQuantityText: {
    fontSize: 11,
    color: '#1976d2',
    fontWeight: '600',
  },
  seedBatchItemGenetic: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  seedBatchItemBreeder: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  seedBatchItemType: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  seedBatchItemCheck: {
    fontSize: 24,
    color: '#4CAF50',
    marginLeft: 12,
  },
});
