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
import { Clone, Plant } from '../types';
import { clonesAPI, plantsAPI } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'NewClone'>;
  route: RouteProp<RootStackParamList, 'NewClone'>;
};

type CloneStatus = 'cutting' | 'rooting' | 'rooted' | 'planted' | 'failed' | 'discarded';

const CLONE_STATUSES: { value: CloneStatus; label: string; icon: string; color: string }[] = [
  { value: 'cutting', label: 'Cortado', icon: '✂️', color: '#9E9E9E' },
  { value: 'rooting', label: 'Enraizando', icon: '🌱', color: '#FFA500' },
  { value: 'rooted', label: 'Enraizado', icon: '✅', color: '#4CAF50' },
  { value: 'planted', label: 'Plantado', icon: '🌿', color: '#2196F3' },
  { value: 'failed', label: 'Falhou', icon: '❌', color: '#F44336' },
  { value: 'discarded', label: 'Descartado', icon: '🗑️', color: '#795548' },
];

export default function NewCloneScreen({ navigation, route }: Props) {
  const editId = route.params?.editId;
  const preselectedMotherId = route.params?.motherId;
  const preselectedMotherName = route.params?.motherName;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [showPlantPicker, setShowPlantPicker] = useState(false);

  // Form fields
  const [motherPlantId, setMotherPlantId] = useState<number | undefined>(preselectedMotherId);
  const [selectedMotherName, setSelectedMotherName] = useState<string>(preselectedMotherName || '');
  const [cloneCode, setCloneCode] = useState('');
  const [status, setStatus] = useState<CloneStatus>('cutting');
  const [cutDate, setCutDate] = useState(new Date().toISOString().split('T')[0]);
  const [rootingDate, setRootingDate] = useState('');
  const [medium, setMedium] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Buscar plantas em fase vegetativa ou floração (podem ser mães)
      const allPlants = await plantsAPI.getAll();
      const motherCandidates = allPlants.filter(
        (p: Plant) => ['vegetative', 'flowering'].includes(p.current_phase || '')
      );
      setPlants(motherCandidates);

      if (editId) {
        const clone = await clonesAPI.getById(editId);
        setMotherPlantId(clone.mother_plant_id);
        setCloneCode(clone.clone_code);
        setStatus((clone.status as CloneStatus) || 'cutting');
        setCutDate(clone.cut_date?.split('T')[0] || '');
        setRootingDate(clone.rooting_date?.split('T')[0] || '');
        setMedium(clone.rooting_medium || '');
        setNotes(clone.notes || '');

        if (clone.mother_plant_name) {
          setSelectedMotherName(clone.mother_plant_name);
        }
      } else {
        // Generate default clone code
        const today = new Date();
        const defaultCode = `CLONE-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
        setCloneCode(defaultCode);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = (): boolean => {
    if (!motherPlantId) {
      Alert.alert('Erro', 'Selecione a planta mãe');
      return false;
    }

    if (!cloneCode.trim()) {
      Alert.alert('Erro', 'O código do clone é obrigatório');
      return false;
    }

    if (!cutDate) {
      Alert.alert('Erro', 'A data do corte é obrigatória');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const cloneData: Partial<Clone> = {
        mother_plant_id: motherPlantId!,
        clone_code: cloneCode.trim(),
        status,
        cut_date: cutDate,
        rooting_date: rootingDate || undefined,
        rooting_medium: medium.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editId) {
        await clonesAPI.update(editId, cloneData);
        Alert.alert('Sucesso', 'Clone atualizado com sucesso!');
      } else {
        await clonesAPI.create(cloneData);
        Alert.alert('Sucesso', 'Clone registrado com sucesso!');
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Erro ao salvar clone:', error);
      Alert.alert('Erro', error.message || 'Não foi possível salvar o clone');
    } finally {
      setLoading(false);
    }
  };

  const selectMother = (plant: Plant) => {
    setMotherPlantId(plant.id);
    setSelectedMotherName(plant.name);
    setShowPlantPicker(false);
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
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🌿 Clonagem</Text>
          <Text style={styles.infoText}>
            Registre aqui os clones (mudas) retirados de plantas mães. 
            Acompanhe o processo de enraizamento e mantenha a rastreabilidade genética.
          </Text>
        </View>

        {/* Mother Plant Picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Planta Mãe *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowPlantPicker(!showPlantPicker)}
          >
            <Text style={[styles.pickerButtonText, !selectedMotherName && styles.placeholder]}>
              {selectedMotherName || 'Selecionar planta mãe'}
            </Text>
            <Text style={styles.pickerArrow}>{showPlantPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showPlantPicker && (
            <View style={styles.pickerList}>
              {plants.map((plant) => (
                <TouchableOpacity
                  key={plant.id}
                  style={[
                    styles.pickerItem,
                    motherPlantId === plant.id && styles.pickerItemSelected,
                  ]}
                  onPress={() => selectMother(plant)}
                >
                  <Text style={styles.pickerItemText}>
                    🌱 {plant.name}
                  </Text>
                  <Text style={styles.pickerItemSubtext}>
                    {plant.code} • {formatPhase(plant.current_phase)}
                  </Text>
                </TouchableOpacity>
              ))}
              {plants.length === 0 && (
                <View style={styles.pickerItem}>
                  <Text style={styles.pickerItemEmpty}>
                    Nenhuma planta disponível para clonagem
                  </Text>
                  <Text style={styles.pickerItemHint}>
                    (plantas devem estar em vegetativo ou floração)
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Clone Code */}
        <View style={styles.field}>
          <Text style={styles.label}>Código do Clone *</Text>
          <TextInput
            style={styles.input}
            value={cloneCode}
            onChangeText={setCloneCode}
            placeholder="Ex: CLONE-001"
            placeholderTextColor="#999"
          />
        </View>

        {/* Status */}
        <View style={styles.field}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusContainer}>
            {CLONE_STATUSES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.statusButton,
                  status === s.value && { backgroundColor: s.color },
                ]}
                onPress={() => setStatus(s.value)}
              >
                <Text style={styles.statusIcon}>{s.icon}</Text>
                <Text
                  style={[
                    styles.statusButtonText,
                    status === s.value && styles.statusButtonTextSelected,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cut Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Data do Corte *</Text>
          <TextInput
            style={styles.input}
            value={cutDate}
            onChangeText={setCutDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#999"
          />
          <Text style={styles.hint}>Formato: AAAA-MM-DD (ex: 2024-01-15)</Text>
        </View>

        {/* Rooting Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Data de Enraizamento</Text>
          <TextInput
            style={styles.input}
            value={rootingDate}
            onChangeText={setRootingDate}
            placeholder="YYYY-MM-DD (quando enraizar)"
            placeholderTextColor="#999"
          />
        </View>

        {/* Medium */}
        <View style={styles.field}>
          <Text style={styles.label}>Meio de Enraizamento</Text>
          <TextInput
            style={styles.input}
            value={medium}
            onChangeText={setMedium}
            placeholder="Ex: Gel de clonagem, Rockwool, Água..."
            placeholderTextColor="#999"
          />
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notas sobre o clone, técnica utilizada..."
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
              {editId ? '✏️ Atualizar Clone' : '🌿 Registrar Clone'}
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
  infoCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
    maxHeight: 250,
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
    fontWeight: '600',
    color: '#333',
  },
  pickerItemSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  pickerItemEmpty: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  pickerItemHint: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 4,
  },
  statusIcon: {
    fontSize: 14,
  },
  statusButtonText: {
    fontSize: 12,
    color: '#666',
  },
  statusButtonTextSelected: {
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
