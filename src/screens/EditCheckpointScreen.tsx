import React, { useState, useEffect } from 'react';
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

type Props = NativeStackScreenProps<RootStackParamList, 'EditCheckpoint'>;

const CHECKPOINT_TYPES = [
  { value: 'poda', label: 'Poda', icon: '✂️' },
  { value: 'amarra', label: 'Amarra', icon: '🧵' },
  { value: 'fertilizacao', label: 'Fertilização', icon: '🌱' },
  { value: 'transplante', label: 'Transplante', icon: '🏡' },
  { value: 'defensivo', label: 'Defensivo', icon: '🛡️' },
  { value: 'outro', label: 'Outro', icon: '📌' },
] as const;

export default function EditCheckpointScreen({ route, navigation }: Props) {
  const { checkpointId } = route.params;
  const [checkpoint, setCheckpoint] = useState<PlantCheckpoint | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCheckpoint();
  }, [checkpointId]);

  const loadCheckpoint = async () => {
    try {
      setLoading(true);
      // Como não temos uma API específica para buscar um checkpoint por ID,
      // vamos buscar todos os checkpoints da planta e filtrar
      // Isso pode ser otimizado no futuro
      const response = await fetch(`http://192.168.1.6:3000/api/checkpoints/${checkpointId}`);
      const data = await response.json();
      setCheckpoint(data);
      setSelectedType(data.checkpoint_type);
      setDate(data.checkpoint_date);
      setDescription(data.description || '');
      setNotes(data.notes || '');
    } catch (error) {
      console.error('Erro ao carregar checkpoint:', error);
      Alert.alert('Erro', 'Não foi possível carregar o checkpoint');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

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
      setSaving(true);
      const updateData: Partial<PlantCheckpoint> = {
        checkpoint_type: selectedType as PlantCheckpoint['checkpoint_type'],
        checkpoint_date: date,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await checkpointsAPI.update(checkpointId, updateData);
      navigation.goBack();
    } catch (error: any) {
      console.error('Erro ao atualizar checkpoint:', error);
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao atualizar checkpoint');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Checkpoint',
      'Tem certeza que deseja excluir este checkpoint?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await checkpointsAPI.delete(checkpointId);
              navigation.goBack();
            } catch (error) {
              console.error('Erro ao excluir checkpoint:', error);
              Alert.alert('Erro', 'Não foi possível excluir o checkpoint');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Carregando checkpoint...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Editar Checkpoint</Text>
        <Text style={styles.subtitle}>Modifique as informações do checkpoint</Text>
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
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={saving}
        >
          <Text style={styles.deleteButtonText}>Excluir</Text>
        </TouchableOpacity>
        <View style={styles.rightButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 20,
    marginBottom: 40,
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#d32f2f',
    fontWeight: '600',
  },
  rightButtons: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});