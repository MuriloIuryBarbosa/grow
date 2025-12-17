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
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { plantsAPI, seedBatchesAPI } from '../services/api';
import { Plant, SeedBatch } from '../types';

type RootStackParamList = {
  EditPlant: { id: number };
  PlantDetail: { id: number };
};

type EditPlantRouteProp = RouteProp<RootStackParamList, 'EditPlant'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SUBSTRATES = [
  'Terra vegetal',
  'Coco',
  'Perlita',
  'Vermiculita',
  'Hidroponia',
  'Mix (Terra + Perlita)',
  'Mix (Coco + Perlita)',
  'Outro',
];

const PHASES: { value: Plant['current_phase']; label: string; description: string }[] = [
  { value: 'germinacao', label: 'Germinação', description: 'Semente brotando' },
  { value: 'muda', label: 'Muda', description: 'Primeiras folhas' },
  { value: 'vegetacao', label: 'Vegetação', description: 'Crescimento ativo' },
  { value: 'floracao', label: 'Floração', description: 'Produzindo flores' },
];

export default function EditPlantScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditPlantRouteProp>();
  const { id } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalPlant, setOriginalPlant] = useState<Plant | null>(null);
  
  // Seed batches
  const [seedBatches, setSeedBatches] = useState<SeedBatch[]>([]);
  const [loadingSeedBatches, setLoadingSeedBatches] = useState(true);
  const [selectedSeedBatch, setSelectedSeedBatch] = useState<SeedBatch | null>(null);
  const [showSeedBatchModal, setShowSeedBatchModal] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [genetic, setGenetic] = useState('');
  const [plantingDate, setPlantingDate] = useState('');
  const [germinationDate, setGerminationDate] = useState('');
  const [substrate, setSubstrate] = useState('');
  const [substrateOther, setSubstrateOther] = useState('');
  const [currentPhase, setCurrentPhase] = useState<Plant['current_phase']>('germinacao');
  const [currentLocation, setCurrentLocation] = useState('');
  const [seedBatchId, setSeedBatchId] = useState<number | undefined>(undefined);

  // Modal states
  const [showSubstrateModal, setShowSubstrateModal] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);

  useEffect(() => {
    loadPlant();
    loadSeedBatches();
  }, [id]);

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

  const loadPlant = async () => {
    try {
      setLoading(true);
      const plant = await plantsAPI.getById(id);
      setOriginalPlant(plant);
      
      // Populate form fields
      setName(plant.name || '');
      setCode(plant.code || '');
      setGenetic(plant.genetic || '');
      setPlantingDate(formatDateForDisplay(plant.planting_date));
      setGerminationDate(formatDateForDisplay(plant.germination_date));
      setCurrentLocation(plant.current_location || '');
      setCurrentPhase(plant.current_phase || 'germinacao');
      setSeedBatchId(plant.seed_batch_id);
      
      // Se a planta já tem um lote vinculado, buscar os dados do lote
      if (plant.seed_batch_id) {
        try {
          const batch = await seedBatchesAPI.getById(plant.seed_batch_id);
          setSelectedSeedBatch(batch);
        } catch (error) {
          console.error('Erro ao carregar lote de semente:', error);
        }
      }
      
      // Handle substrate
      if (plant.substrate && SUBSTRATES.includes(plant.substrate)) {
        setSubstrate(plant.substrate);
      } else if (plant.substrate) {
        setSubstrate('Outro');
        setSubstrateOther(plant.substrate);
      }
    } catch (error) {
      console.error('Erro ao carregar planta:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da planta');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDisplay = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const formatDateForInput = (text: string): string => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const parseDateToISO = (dateStr: string): string | null => {
    if (!dateStr || dateStr.length < 10) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    if (!day || !month || !year || year.length !== 4) return null;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, informe o nome da planta');
      return;
    }

    if (!plantingDate || plantingDate.length < 10) {
      Alert.alert('Campo obrigatório', 'Por favor, informe a data de plantio');
      return;
    }

    const finalSubstrate = substrate === 'Outro' ? substrateOther : substrate;

    const plantData: Partial<Plant> = {
      name: name.trim(),
      code: code.trim() || undefined,
      genetic: genetic.trim() || undefined,
      planting_date: parseDateToISO(plantingDate) || undefined,
      germination_date: parseDateToISO(germinationDate) || undefined,
      substrate: finalSubstrate || undefined,
      current_phase: currentPhase,
      current_location: currentLocation.trim() || undefined,
      seed_batch_id: seedBatchId,
      origin_type: seedBatchId ? 'seed' : originalPlant?.origin_type,
    };

    try {
      setSaving(true);
      await plantsAPI.update(id, plantData);
      Alert.alert('Sucesso', 'Planta atualizada com sucesso!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Erro ao atualizar planta:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a planta. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedBatchSelect = (batch: SeedBatch | null) => {
    setSelectedSeedBatch(batch);
    setShowSeedBatchModal(false);
    
    if (batch) {
      setSeedBatchId(batch.id);
      // Auto-preencher genética se ainda não tiver
      if (!genetic && batch.genetic_name) {
        setGenetic(batch.genetic_name);
      }
    } else {
      setSeedBatchId(undefined);
    }
  };

  const hasChanges = (): boolean => {
    if (!originalPlant) return false;
    const finalSubstrate = substrate === 'Outro' ? substrateOther : substrate;
    return (
      name !== (originalPlant.name || '') ||
      code !== (originalPlant.code || '') ||
      genetic !== (originalPlant.genetic || '') ||
      plantingDate !== formatDateForDisplay(originalPlant.planting_date) ||
      germinationDate !== formatDateForDisplay(originalPlant.germination_date) ||
      finalSubstrate !== (originalPlant.substrate || '') ||
      currentPhase !== (originalPlant.current_phase || 'germinacao') ||
      currentLocation !== (originalPlant.current_location || '') ||
      seedBatchId !== originalPlant.seed_batch_id
    );
  };

  const handleCancel = () => {
    if (hasChanges()) {
      Alert.alert(
        'Descartar alterações?',
        'Você tem alterações não salvas. Deseja descartá-las?',
        [
          { text: 'Continuar editando', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const renderSubstrateModal = () => (
    <Modal
      visible={showSubstrateModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSubstrateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Selecione o Substrato</Text>
          <FlatList
            data={SUBSTRATES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  substrate === item && styles.modalItemSelected,
                ]}
                onPress={() => {
                  setSubstrate(item);
                  setShowSubstrateModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    substrate === item && styles.modalItemTextSelected,
                  ]}
                >
                  {item}
                </Text>
                {substrate === item && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowSubstrateModal(false)}
          >
            <Text style={styles.modalCloseText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderPhaseModal = () => (
    <Modal
      visible={showPhaseModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPhaseModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Selecione a Fase</Text>
          <FlatList
            data={PHASES}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  currentPhase === item.value && styles.modalItemSelected,
                ]}
                onPress={() => {
                  setCurrentPhase(item.value);
                  setShowPhaseModal(false);
                }}
              >
                <View style={styles.phaseItemContent}>
                  <Text
                    style={[
                      styles.modalItemText,
                      currentPhase === item.value && styles.modalItemTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text style={styles.phaseDescription}>{item.description}</Text>
                </View>
                {currentPhase === item.value && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowPhaseModal(false)}
          >
            <Text style={styles.modalCloseText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderSeedBatchModal = () => (
    <Modal
      visible={showSeedBatchModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSeedBatchModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🌱 Selecionar Lote de Sementes</Text>
          {loadingSeedBatches ? (
            <ActivityIndicator size="large" color="#4CAF50" style={{ marginVertical: 40 }} />
          ) : seedBatches.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🌱</Text>
              <Text style={styles.emptyStateText}>Nenhum lote disponível</Text>
              <Text style={styles.emptyStateSubtext}>Cadastre sementes no Banco Genético</Text>
            </View>
          ) : (
            <FlatList
              data={seedBatches}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    styles.seedBatchItem,
                    selectedSeedBatch?.id === item.id && styles.modalItemSelected,
                  ]}
                  onPress={() => handleSeedBatchSelect(item)}
                >
                  <View style={styles.seedBatchItemContent}>
                    <View style={styles.seedBatchItemHeader}>
                      <Text style={[
                        styles.modalItemText,
                        styles.seedBatchItemCode,
                        selectedSeedBatch?.id === item.id && styles.modalItemTextSelected,
                      ]}>
                        {item.batch_code}
                      </Text>
                      <View style={styles.seedBatchQuantityBadge}>
                        <Text style={styles.seedBatchQuantityText}>
                          {item.current_quantity} disp.
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.seedBatchItemGenetic}>
                      {item.genetic_name || 'Genética não especificada'}
                    </Text>
                    {item.breeder && (
                      <Text style={styles.seedBatchItemBreeder}>Breeder: {item.breeder}</Text>
                    )}
                  </View>
                  {selectedSeedBatch?.id === item.id && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowSeedBatchModal(false)}
          >
            <Text style={styles.modalCloseText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2d5a27" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  const selectedPhase = PHASES.find((p) => p.value === currentPhase);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>✏️ Editar Planta</Text>
        <Text style={styles.subtitle}>Atualize os dados de cadastro</Text>
      </View>

      {/* Nome */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Nome da Planta <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Tomate Cereja"
          placeholderTextColor="#999"
        />
      </View>

      {/* Código */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Código / Identificador</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="Ex: TC-001"
          placeholderTextColor="#999"
        />
      </View>

      {/* Lote de Sementes */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>🌱 Lote de Sementes</Text>
        <TouchableOpacity
          style={[styles.selector, selectedSeedBatch && styles.selectorSelected]}
          onPress={() => setShowSeedBatchModal(true)}
          disabled={loadingSeedBatches}
        >
          {loadingSeedBatches ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <>
              <View style={styles.selectorContent}>
                {selectedSeedBatch ? (
                  <>
                    <Text style={[styles.selectorText, styles.seedBatchSelectedCode]}>
                      {selectedSeedBatch.batch_code}
                    </Text>
                    <Text style={styles.selectorSubtext}>
                      {selectedSeedBatch.genetic_name || 'Genética não especificada'}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.selectorPlaceholder}>
                    Selecionar lote de sementes (opcional)
                  </Text>
                )}
              </View>
              <Text style={styles.selectorArrow}>▼</Text>
            </>
          )}
        </TouchableOpacity>
        {selectedSeedBatch && (
          <TouchableOpacity
            style={styles.clearSelection}
            onPress={() => handleSeedBatchSelect(null)}
          >
            <Text style={styles.clearSelectionText}>✕ Remover vínculo com lote</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Genética */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Genética / Variedade</Text>
        <TextInput
          style={[styles.input, selectedSeedBatch && styles.inputDisabled]}
          value={genetic}
          onChangeText={setGenetic}
          placeholder="Ex: Híbrido F1"
          placeholderTextColor="#999"
          editable={!selectedSeedBatch}
        />
        {selectedSeedBatch && (
          <Text style={styles.hintSuccess}>✓ Preenchido pelo lote de sementes</Text>
        )}
      </View>

      {/* Data de Plantio */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Data de Plantio <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={plantingDate}
          onChangeText={(text) => setPlantingDate(formatDateForInput(text))}
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#999"
          keyboardType="numeric"
          maxLength={10}
        />
      </View>

      {/* Data de Germinação */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Data de Germinação</Text>
        <TextInput
          style={styles.input}
          value={germinationDate}
          onChangeText={(text) => setGerminationDate(formatDateForInput(text))}
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#999"
          keyboardType="numeric"
          maxLength={10}
        />
      </View>

      {/* Substrato */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Substrato</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowSubstrateModal(true)}
        >
          <Text style={substrate ? styles.selectorText : styles.selectorPlaceholder}>
            {substrate || 'Selecione o substrato'}
          </Text>
          <Text style={styles.selectorArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Campo "Outro" substrato */}
      {substrate === 'Outro' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Especifique o substrato</Text>
          <TextInput
            style={styles.input}
            value={substrateOther}
            onChangeText={setSubstrateOther}
            placeholder="Descreva o substrato utilizado"
            placeholderTextColor="#999"
          />
        </View>
      )}

      {/* Fase Atual */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Fase Atual</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowPhaseModal(true)}
        >
          <View style={styles.selectorContent}>
            <Text style={styles.selectorText}>
              {selectedPhase?.label || 'Selecione a fase'}
            </Text>
            {selectedPhase && (
              <Text style={styles.selectorSubtext}>{selectedPhase.description}</Text>
            )}
          </View>
          <Text style={styles.selectorArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Localização */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Localização Atual</Text>
        <TextInput
          style={styles.input}
          value={currentLocation}
          onChangeText={setCurrentLocation}
          placeholder="Ex: Estufa A, Vaso 3"
          placeholderTextColor="#999"
        />
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>💾 Salvar Alterações</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>

      {renderSubstrateModal()}
      {renderPhaseModal()}
      {renderSeedBatchModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d5a27',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#e74c3c',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selector: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorContent: {
    flex: 1,
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
  },
  selectorSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  selectorPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  selectorArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#2d5a27',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemSelected: {
    backgroundColor: '#e8f5e9',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalItemTextSelected: {
    color: '#2d5a27',
    fontWeight: '600',
  },
  phaseItemContent: {
    flex: 1,
  },
  phaseDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    color: '#2d5a27',
    fontWeight: 'bold',
  },
  modalCloseButton: {
    marginTop: 12,
    marginHorizontal: 20,
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  // Estilos para Lote de Sementes
  selectorSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0fff0',
  },
  seedBatchSelectedCode: {
    color: '#2d5016',
    fontWeight: '600',
  },
  clearSelection: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearSelectionText: {
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
  },
  seedBatchItem: {
    paddingVertical: 12,
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
    fontWeight: '700',
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
    marginTop: 2,
  },
  seedBatchItemBreeder: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
});
