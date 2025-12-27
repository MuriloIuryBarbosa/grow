import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { checkpointsAPI } from '../services/api';
import { PlantCheckpoint } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'NewCheckpoint'>;

const CHECKPOINT_TYPES = [
  { value: 'poda', label: 'Poda', icon: '✂️' },
  { value: 'amarra', label: 'Amarra', icon: '🧵' },
  { value: 'fertilizacao', label: 'Fertilização', icon: '🌱' },
  { value: 'transplante', label: 'Transplante', icon: '🏡' },
  { value: 'defensivo', label: 'Defensivo', icon: '🛡️' },
  { value: 'outro', label: 'Outro', icon: '📌' },
] as const;

export default function NewCheckpointScreen({ route, navigation }: Props) {
  const { plantId } = route.params;
  const [selectedType, setSelectedType] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!selectedType) {
      Alert.alert('Erro', 'Selecione o tipo de checkpoint');
      return;
    }

    if (!date) {
      Alert.alert('Erro', 'Selecione a data do checkpoint');
      return;
    }

    try {
      setLoading(true);
      const checkpointData: Omit<PlantCheckpoint, 'id' | 'created_at' | 'updated_at'> = {
        plant_id: plantId,
        checkpoint_type: selectedType as PlantCheckpoint['checkpoint_type'],
        checkpoint_date: date,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await checkpointsAPI.create(plantId, checkpointData);
      navigation.goBack();
    } catch (error: any) {
      console.error('Erro ao criar checkpoint:', error);
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao criar checkpoint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Novo Checkpoint</Text>
        <Text style={styles.subtitle}>Marque um evento importante no crescimento da planta</Text>
      </View>

      {/* Tipo de Checkpoint */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipo de Checkpoint</Text>
        <View style={styles.typeGrid}>
          {CHECKPOINT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeButton,
                selectedType === type.value && styles.typeButtonSelected,
              ]}
              onPress={() => setSelectedType(type.value)}
            >
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  selectedType === type.value && styles.typeLabelSelected,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
        />
      </View>

      {/* Descrição */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Descrição (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Descrição breve do checkpoint"
          placeholderTextColor="#999"
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Observações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Observações (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Observações detalhadas"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
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
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar</Text>
          )}
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeButton: {
    width: '48%',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonSelected: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  typeLabelSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 20,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});