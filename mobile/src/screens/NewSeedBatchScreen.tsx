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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { SeedBatch, GeneticStrain } from '../types';
import { seedBatchesAPI, geneticsAPI } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'NewSeedBatch'>;
  route: RouteProp<RootStackParamList, 'NewSeedBatch'>;
};

type SeedType = 'regular' | 'feminized' | 'autoflower' | 'cbd' | 'unknown';

const SEED_TYPES: { value: SeedType; label: string; icon: string }[] = [
  { value: 'feminized', label: 'Feminizada', icon: '♀️' },
  { value: 'autoflower', label: 'Automática', icon: '⚡' },
  { value: 'regular', label: 'Regular', icon: '🔄' },
  { value: 'cbd', label: 'CBD', icon: '💚' },
  { value: 'unknown', label: 'Desconhecido', icon: '❓' },
];

export default function NewSeedBatchScreen({ navigation, route }: Props) {
  const editId = route.params?.editId;
  const preselectedGeneticId = route.params?.geneticId;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [genetics, setGenetics] = useState<GeneticStrain[]>([]);
  const [showGeneticPicker, setShowGeneticPicker] = useState(false);

  // Form fields
  const [geneticStrainId, setGeneticStrainId] = useState<number | undefined>(preselectedGeneticId);
  const [selectedGeneticName, setSelectedGeneticName] = useState<string>('');
  const [batchCode, setBatchCode] = useState('');
  const [seedType, setSeedType] = useState<SeedType>('feminized');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [source, setSource] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const geneticsData = await geneticsAPI.getAll(true);
      setGenetics(geneticsData);

      if (preselectedGeneticId) {
        const selected = geneticsData.find((g: GeneticStrain) => g.id === preselectedGeneticId);
        if (selected) {
          setSelectedGeneticName(selected.name);
        }
      }

      if (editId) {
        const batch = await seedBatchesAPI.getById(editId);
        setGeneticStrainId(batch.genetic_strain_id);
        setBatchCode(batch.batch_code);
        setSeedType((batch.seed_type as SeedType) || 'unknown');
        setInitialQuantity(batch.initial_quantity.toString());
        setCurrentQuantity(batch.current_quantity.toString());
        setAcquisitionDate(batch.acquisition_date?.split('T')[0] || '');
        setSource(batch.source || '');
        setPrice(batch.price?.toString() || '');
        setNotes(batch.notes || '');

        if (batch.genetic_name) {
          setSelectedGeneticName(batch.genetic_name);
        }
      } else {
        // Generate default batch code
        const today = new Date();
        const defaultCode = `LOTE-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        setBatchCode(defaultCode);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = (): boolean => {
    if (!batchCode.trim()) {
      Alert.alert('Erro', 'O código do lote é obrigatório');
      return false;
    }

    if (!initialQuantity || parseInt(initialQuantity) <= 0) {
      Alert.alert('Erro', 'A quantidade inicial deve ser maior que zero');
      return false;
    }

    const initial = parseInt(initialQuantity);
    const current = currentQuantity ? parseInt(currentQuantity) : initial;

    if (current > initial) {
      Alert.alert('Erro', 'A quantidade atual não pode ser maior que a inicial');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const initial = parseInt(initialQuantity);
      const current = currentQuantity ? parseInt(currentQuantity) : initial;

      const batchData: Partial<SeedBatch> = {
        genetic_strain_id: geneticStrainId,
        batch_code: batchCode.trim(),
        seed_type: seedType,
        initial_quantity: initial,
        current_quantity: current,
        acquisition_date: acquisitionDate || undefined,
        source: source.trim() || undefined,
        price: price ? parseFloat(price) : undefined,
        notes: notes.trim() || undefined,
      };

      if (editId) {
        await seedBatchesAPI.update(editId, batchData);
        Alert.alert('Sucesso', 'Lote atualizado com sucesso!');
      } else {
        await seedBatchesAPI.create(batchData);
        Alert.alert('Sucesso', 'Lote cadastrado com sucesso!');
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Erro ao salvar lote:', error);
      Alert.alert('Erro', error.message || 'Não foi possível salvar o lote');
    } finally {
      setLoading(false);
    }
  };

  const selectGenetic = (genetic: GeneticStrain) => {
    setGeneticStrainId(genetic.id);
    setSelectedGeneticName(genetic.name);
    setShowGeneticPicker(false);
  };

  if (loadingData) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2d5016" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        {/* Genetic Strain Picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Genética</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowGeneticPicker(!showGeneticPicker)}
          >
            <Text style={[styles.pickerButtonText, !selectedGeneticName && styles.placeholder]}>
              {selectedGeneticName || 'Selecionar genética (opcional)'}
            </Text>
            <Text style={styles.pickerArrow}>{showGeneticPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showGeneticPicker && (
            <View style={styles.pickerList}>
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  setGeneticStrainId(undefined);
                  setSelectedGeneticName('');
                  setShowGeneticPicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>❌ Nenhuma</Text>
              </TouchableOpacity>
              {genetics.map((genetic) => (
                <TouchableOpacity
                  key={genetic.id}
                  style={[
                    styles.pickerItem,
                    geneticStrainId === genetic.id && styles.pickerItemSelected,
                  ]}
                  onPress={() => selectGenetic(genetic)}
                >
                  <Text style={styles.pickerItemText}>
                    🧬 {genetic.name}
                    {genetic.breeder && ` (${genetic.breeder})`}
                  </Text>
                </TouchableOpacity>
              ))}
              {genetics.length === 0 && (
                <View style={styles.pickerItem}>
                  <Text style={styles.pickerItemEmpty}>
                    Nenhuma genética cadastrada
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Batch Code */}
        <View style={styles.field}>
          <Text style={styles.label}>Código do Lote *</Text>
          <TextInput
            style={styles.input}
            value={batchCode}
            onChangeText={setBatchCode}
            placeholder="Ex: LOTE-2024-001"
            placeholderTextColor="#999"
          />
        </View>

        {/* Seed Type */}
        <View style={styles.field}>
          <Text style={styles.label}>Tipo de Semente</Text>
          <View style={styles.typeContainer}>
            {SEED_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.typeButton,
                  seedType === t.value && styles.typeButtonSelected,
                ]}
                onPress={() => setSeedType(t.value)}
              >
                <Text style={styles.typeIcon}>{t.icon}</Text>
                <Text
                  style={[
                    styles.typeButtonText,
                    seedType === t.value && styles.typeButtonTextSelected,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quantities */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Quantidade Inicial *</Text>
            <TextInput
              style={styles.input}
              value={initialQuantity}
              onChangeText={(text) => {
                setInitialQuantity(text);
                if (!editId) {
                  setCurrentQuantity(text);
                }
              }}
              placeholder="0"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
          </View>
          <View style={{ width: 16 }} />
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Quantidade Atual</Text>
            <TextInput
              style={styles.input}
              value={currentQuantity}
              onChangeText={setCurrentQuantity}
              placeholder={initialQuantity || '0'}
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Acquisition Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Data de Aquisição</Text>
          <TextInput
            style={styles.input}
            value={acquisitionDate}
            onChangeText={setAcquisitionDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#999"
          />
          <Text style={styles.hint}>Formato: AAAA-MM-DD (ex: 2024-01-15)</Text>
        </View>

        {/* Source */}
        <View style={styles.field}>
          <Text style={styles.label}>Fonte / Fornecedor</Text>
          <TextInput
            style={styles.input}
            value={source}
            onChangeText={setSource}
            placeholder="Ex: Seedsman, Royal Queen Seeds..."
            placeholderTextColor="#999"
          />
        </View>

        {/* Price */}
        <View style={styles.field}>
          <Text style={styles.label}>Preço (R$)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notas sobre o lote..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {editId ? '✏️ Atualizar Lote' : '📦 Cadastrar Lote'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

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
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  pickerButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  pickerArrow: {
    fontSize: 12,
    color: '#666',
  },
  pickerList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 200,
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemSelected: {
    backgroundColor: '#e8f5e9',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#333',
  },
  pickerItemEmpty: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 4,
  },
  typeButtonSelected: {
    backgroundColor: '#2d5016',
    borderColor: '#2d5016',
  },
  typeIcon: {
    fontSize: 14,
  },
  typeButtonText: {
    fontSize: 12,
    color: '#666',
  },
  typeButtonTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2d5016',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
