import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../navigation/AppNavigator';
import { recordsAPI, API_BASE_URL } from '../services/api';
import { DailyRecord } from '../types';
import axios from 'axios';

type Props = NativeStackScreenProps<RootStackParamList, 'EditRecord'>;

export default function EditRecordScreen({ route, navigation }: Props) {
  const { plantId, recordId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [currentPhotoPath, setCurrentPhotoPath] = useState<string | null>(null);
  const [sizeText, setSizeText] = useState(''); // Estado para texto do tamanho (permite decimais)

  const [formData, setFormData] = useState<Partial<DailyRecord>>({
    record_date: '',
    plant_size: undefined,
    leaf_count: undefined,
    branch_count: undefined,
    ppfd: undefined,
    vpd: undefined,
    fertilization: '',
    observations: '',
    location: '',
  });

  useEffect(() => {
    loadRecord();
  }, []);

  const loadRecord = async () => {
    try {
      setLoading(true);
      const data = await recordsAPI.getById(plantId, recordId);
      setRecord(data);
      setCurrentPhotoPath(data.photo_path || null);
      setSizeText(data.plant_size?.toString() || ''); // Inicializar texto do tamanho
      
      let dateStr = data.record_date;
      if (dateStr) {
        dateStr = dateStr.split('T')[0];
      }
      
      setFormData({
        record_date: dateStr,
        plant_size: data.plant_size,
        leaf_count: data.leaf_count,
        branch_count: data.branch_count,
        ppfd: data.ppfd,
        vpd: data.vpd,
        fertilization: data.fertilization || '',
        observations: data.observations || '',
        location: data.location || '',
      });
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível carregar o registro');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.record_date) {
      Alert.alert('Erro', 'A data é obrigatória');
      return;
    }

    setSaving(true);
    try {
      let photoPath = currentPhotoPath;
      
      // Upload da nova foto se existir
      if (imageUri) {
        const uploadFormData = new FormData();
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.([\w]+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        uploadFormData.append('photo', {
          uri: imageUri,
          name: filename,
          type,
        } as any);

        const uploadResponse = await axios.post(
          `${API_BASE_URL}/api/upload`,
          uploadFormData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        
        photoPath = uploadResponse.data.photoPath;
      }

      await recordsAPI.update(plantId, recordId, { ...formData, photo_path: photoPath });
      Alert.alert('Sucesso', 'Registro atualizado com sucesso', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Error updating record:', err);
      Alert.alert('Erro', 'Não foi possível atualizar o registro');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Registro',
      'Tem certeza que deseja excluir este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await recordsAPI.delete(plantId, recordId);
              Alert.alert('Sucesso', 'Registro excluído', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível excluir o registro');
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const updateField = (field: keyof DailyRecord, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Precisamos de permissão para acessar suas fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Precisamos de permissão para acessar a câmera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const removePhoto = () => {
    setImageUri(null);
    setCurrentPhotoPath(null);
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'Adicionar Foto',
      'Escolha uma opção',
      [
        { text: 'Tirar Foto', onPress: takePhoto },
        { text: 'Escolher da Galeria', onPress: pickImage },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Carregando registro...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>✏️ Editar Registro</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Data *</Text>
          <TextInput
            style={styles.input}
            value={formData.record_date}
            onChangeText={(value) => updateField('record_date', value)}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <Text style={styles.sectionTitle}>📏 Medidas da Planta</Text>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Tamanho (cm)</Text>
            <TextInput
              style={styles.input}
              value={sizeText}
              onChangeText={(value) => {
                // Permitir entrada de decimais (ponto ou vírgula)
                const normalized = value.replace(',', '.');
                // Validar formato: números com opcional ponto decimal
                if (normalized === '' || /^\d*\.?\d*$/.test(normalized)) {
                  setSizeText(normalized);
                  if (normalized === '' || normalized === '.') {
                    updateField('plant_size', undefined);
                  } else {
                    const num = parseFloat(normalized);
                    if (!isNaN(num)) {
                      updateField('plant_size', num);
                    }
                  }
                }
              }}
              placeholder="Ex: 25.5"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Nº Folhas</Text>
            <TextInput
              style={styles.input}
              value={formData.leaf_count?.toString() || ''}
              onChangeText={(value) => updateField('leaf_count', value ? parseInt(value) : undefined)}
              placeholder="Ex: 12"
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Número de Ramos</Text>
          <TextInput
            style={styles.input}
            value={formData.branch_count?.toString() || ''}
            onChangeText={(value) => updateField('branch_count', value ? parseInt(value) : undefined)}
            placeholder="Ex: 4"
            keyboardType="number-pad"
          />
        </View>

        <Text style={styles.sectionTitle}>🌡️ Condições Ambientais</Text>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>PPFD (µmol/m²/s)</Text>
            <TextInput
              style={styles.input}
              value={formData.ppfd?.toString() || ''}
              onChangeText={(value) => updateField('ppfd', value ? parseFloat(value) : undefined)}
              placeholder="Ex: 800"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>VPD (kPa)</Text>
            <TextInput
              style={styles.input}
              value={formData.vpd?.toString() || ''}
              onChangeText={(value) => updateField('vpd', value ? parseFloat(value) : undefined)}
              placeholder="Ex: 1.2"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>📝 Observações</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Fertilização</Text>
          <TextInput
            style={styles.input}
            value={formData.fertilization}
            onChangeText={(value) => updateField('fertilization', value)}
            placeholder="Ex: NPK 10-10-10"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Localização</Text>
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={(value) => updateField('location', value)}
            placeholder="Ex: Estufa 1"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.observations}
            onChangeText={(value) => updateField('observations', value)}
            placeholder="Observações sobre o dia..."
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Foto</Text>
          {(imageUri || currentPhotoPath) ? (
            <View>
              <Image 
                source={{ uri: imageUri || `${API_BASE_URL}${currentPhotoPath}` }} 
                style={styles.photoPreview} 
              />
              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={[styles.button, styles.changePhotoButton]}
                  onPress={showPhotoOptions}
                >
                  <Text style={styles.changePhotoButtonText}>📷 Alterar Foto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.removePhotoButton]}
                  onPress={removePhoto}
                >
                  <Text style={styles.removePhotoButtonText}>🗑️ Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.addPhotoButton]}
              onPress={showPhotoOptions}
            >
              <Text style={styles.addPhotoButtonText}>📷 Adicionar Foto</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDelete}
          disabled={saving}
        >
          <Text style={styles.deleteButtonText}>🗑️ Excluir Registro</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  photoPreview: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginBottom: 12,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  addPhotoButton: {
    backgroundColor: '#2196F3',
    borderWidth: 0,
  },
  addPhotoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  changePhotoButton: {
    backgroundColor: '#2196F3',
    borderWidth: 0,
    flex: 1,
  },
  changePhotoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  removePhotoButton: {
    backgroundColor: '#f44336',
    borderWidth: 0,
    flex: 1,
  },
  removePhotoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
