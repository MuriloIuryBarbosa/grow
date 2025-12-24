import React, { useState, useRef, useEffect } from 'react';
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

type Props = NativeStackScreenProps<RootStackParamList, 'NewRecord'>;

export default function NewRecordScreen({ route, navigation }: Props) {
  const { plantId, prefilledSize } = route.params;
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sizeText, setSizeText] = useState(''); // Estado para texto do tamanho (permite decimais)
  const [showOptions, setShowOptions] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showDeviceSelection, setShowDeviceSelection] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<MediaDeviceInfo | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [showSizeConfirmation, setShowSizeConfirmation] = useState(false);
  const [confirmedSize, setConfirmedSize] = useState('');
  const [videoReady, setVideoReady] = useState(false);
  const [processingSize, setProcessingSize] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const today = new Date().toISOString().split('T')[0];
  
  useEffect(() => {
    if (prefilledSize) {
      setSizeText(prefilledSize.toString());
      updateField('plant_size', prefilledSize);
    }
  }, [prefilledSize]);
  
  useEffect(() => {
    if (showCamera && videoRef.current && Platform.OS === 'web') {
      const constraints = selectedDevice ? { video: { deviceId: selectedDevice.deviceId } } : { video: true };
      navigator.mediaDevices.getUserMedia(constraints).then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setVideoReady(true);
          };
        }
      }).catch(err => {
        console.error('Error accessing camera:', err);
        Alert.alert('Erro', 'Não foi possível acessar a câmera');
        setShowCamera(false);
      });
    } else {
      setVideoReady(false);
    }
  }, [showCamera, selectedDevice]);
  
  useEffect(() => {
    if (showDeviceSelection && Platform.OS === 'web') {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(videoDevices);
      }).catch(err => {
        console.error('Error enumerating devices:', err);
        // Fallback to default camera
        setSelectedDevice(null);
        setShowDeviceSelection(false);
        setShowCamera(true);
      });
    }
  }, [showDeviceSelection]);
  
  const [formData, setFormData] = useState<Partial<DailyRecord>>({
    record_date: today,
    plant_size: undefined,
    leaf_count: undefined,
    branch_count: undefined,
    ppfd: undefined,
    vpd: undefined,
    fertilization: '',
    observations: '',
    location: '',
  });

  const handleSubmit = async () => {
    if (!formData.record_date) {
      Alert.alert('Erro', 'A data é obrigatória');
      return;
    }

    setLoading(true);
    try {
      let photoPath = undefined;
      
      // Upload da foto se existir
      if (imageUri) {
        const uploadFormData = new FormData();
        if (Platform.OS === 'web' && selectedFile) {
          uploadFormData.append('photo', selectedFile);
        } else {
          const filename = imageUri.split('/').pop() || 'photo.jpg';
          const match = /\.([\w]+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          
          uploadFormData.append('photo', {
            uri: imageUri,
            name: filename,
            type,
          } as any);
        }

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

      await recordsAPI.create(plantId, { ...formData, photo_path: photoPath });
      Alert.alert('Sucesso', 'Registro criado com sucesso', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Error creating record:', err);
      Alert.alert('Erro', 'Não foi possível criar o registro');
    } finally {
      setLoading(false);
    }
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
    setSelectedFile(null);
  };

  const handleCameraOption = () => {
    setShowOptions(false);
    if (Platform.OS === 'web') {
      setShowDeviceSelection(true);
    } else {
      cameraInputRef.current?.click();
    }
  };

  const handleMeasureOption = () => {
    setShowOptions(false);
    setIsMeasuring(true);
    if (Platform.OS === 'web') {
      setShowDeviceSelection(true);
    } else {
      // Para mobile, talvez usar câmera com AR ou algo, mas por enquanto, apenas câmera
      cameraInputRef.current?.click();
    }
  };

  const handleFileOption = () => {
    setShowOptions(false);
    fileInputRef.current?.click();
  };

  const cancelOptions = () => {
    setShowOptions(false);
  };

  const capturePhoto = () => {
    if (!videoReady) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video && Platform.OS === 'web') {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
            if (isMeasuring) {
              setProcessingSize(true);
              // Estimar tamanho
              estimatePlantSize(file).then(size => {
                setEstimatedSize(size);
                setConfirmedSize(size.toString());
                setShowSizeConfirmation(true);
                setSelectedFile(file);
                setImageUri(URL.createObjectURL(file));
                setShowCamera(false);
                setIsMeasuring(false);
                setVideoReady(false);
                setProcessingSize(false);
                // Stop stream
                const stream = video.srcObject as MediaStream;
                if (stream) {
                  stream.getTracks().forEach(track => track.stop());
                }
              }).catch(() => {
                setProcessingSize(false);
                Alert.alert('Erro', 'Não foi possível processar a imagem');
                setShowCamera(false);
                setIsMeasuring(false);
                setVideoReady(false);
              });
            } else {
              setSelectedFile(file);
              setImageUri(URL.createObjectURL(file));
              setShowCamera(false);
              setVideoReady(false);
              // Stop stream
              const stream = video.srcObject as MediaStream;
              if (stream) {
                stream.getTracks().forEach(track => track.stop());
              }
            }
          }
        });
      }
    }
  };

  const cancelCamera = () => {
    setShowCamera(false);
    setVideoReady(false);
    setIsMeasuring(false);
    setProcessingSize(false);
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const selectDevice = (device: MediaDeviceInfo) => {
    setSelectedDevice(device);
    setShowDeviceSelection(false);
    setShowCamera(true);
  };

  const cancelDeviceSelection = () => {
    setShowDeviceSelection(false);
    setIsMeasuring(false);
  };

  const confirmSize = () => {
    const size = parseFloat(confirmedSize);
    if (!isNaN(size)) {
      updateField('plant_size', size);
    }
    setShowSizeConfirmation(false);
    setEstimatedSize(null);
  };

  const cancelSizeConfirmation = () => {
    setShowSizeConfirmation(false);
    setEstimatedSize(null);
    setSelectedFile(null);
    setImageUri(null);
  };

  const estimatePlantSize = async (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          let greenPixels = 0;
          let totalPixels = data.length / 4;
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Detectar pixels verdes (folhas)
            if (g > r + 20 && g > b + 20 && g > 50) {
              greenPixels++;
            }
          }
          
          // Estimar tamanho baseado na porcentagem de pixels verdes
          const greenRatio = greenPixels / totalPixels;
          // Assumir que plantas maiores têm mais pixels verdes
          const estimatedSize = Math.max(5, Math.min(100, 10 + (greenRatio * 80)));
          
          resolve(Math.round(estimatedSize * 10) / 10); // Arredondar para 1 decimal
        } else {
          resolve(25); // Fallback
        }
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const showPhotoOptions = () => {
    if (Platform.OS === 'web') {
      setShowOptions(true);
    } else {
      Alert.alert(
        'Adicionar Foto',
        'Escolha uma opção',
        [
          { text: 'Tirar Foto', onPress: takePhoto },
          { text: 'Escolher da Galeria', onPress: pickImage },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    }
  };

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
        <Text style={styles.title}>📊 Novo Registro Diário</Text>

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
          {imageUri ? (
            <View>
              <Image source={{ uri: imageUri }} style={styles.photoPreview} />
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
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Salvar Registro</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      {showOptions && Platform.OS === 'web' && (
        <View style={styles.optionsModal}>
          <View style={styles.optionsContainer}>
            <Text style={styles.optionsTitle}>Adicionar Foto</Text>
            <TouchableOpacity style={styles.optionButton} onPress={handleCameraOption}>
              <Text style={styles.optionButtonText}>📷 Tirar Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={handleMeasureOption}>
              <Text style={styles.optionButtonText}>📏 Medir Tamanho da Planta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={handleFileOption}>
              <Text style={styles.optionButtonText}>💻 Escolher do Computador</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelOptionButton} onPress={cancelOptions}>
              <Text style={styles.cancelOptionButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {showDeviceSelection && Platform.OS === 'web' && (
        <View style={styles.deviceModal}>
          <View style={styles.deviceContainer}>
            <Text style={styles.deviceTitle}>Selecionar Câmera</Text>
            {videoDevices.map(device => (
              <TouchableOpacity key={device.deviceId} style={styles.deviceButton} onPress={() => selectDevice(device)}>
                <Text style={styles.deviceButtonText}>{device.label || `Câmera ${device.deviceId.slice(0,8)}`}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelDeviceButton} onPress={cancelDeviceSelection}>
              <Text style={styles.cancelDeviceButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {showCamera && Platform.OS === 'web' && (
        <View style={styles.cameraModal}>
          <View style={styles.cameraContainer}>
            <Text style={styles.cameraTitle}>Tirar Foto</Text>
            <video ref={videoRef} autoPlay style={{ width: '100%', height: 300, borderRadius: 8 }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} width={640} height={480} />
            <View style={styles.cameraActions}>
              {processingSize ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text style={styles.processingText}>Processando imagem...</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.captureButton, !videoReady && styles.disabledButton]} 
                  onPress={capturePhoto}
                  disabled={!videoReady}
                >
                  <Text style={styles.captureButtonText}>📷 Capturar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelCameraButton} onPress={cancelCamera}>
                <Text style={styles.cancelCameraButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {showSizeConfirmation && estimatedSize !== null && (
        <View style={styles.sizeModal}>
          <View style={styles.sizeContainer}>
            <Text style={styles.sizeTitle}>Confirme o Tamanho da Planta</Text>
            <Text style={styles.sizeText}>Tamanho estimado: {estimatedSize} cm</Text>
            <TextInput
              style={styles.sizeInput}
              value={confirmedSize}
              onChangeText={setConfirmedSize}
              placeholder="Digite o tamanho em cm"
              keyboardType="decimal-pad"
            />
            <View style={styles.sizeActions}>
              <TouchableOpacity style={styles.confirmSizeButton} onPress={confirmSize}>
                <Text style={styles.confirmSizeButtonText}>Confirmar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelSizeButton} onPress={cancelSizeConfirmation}>
                <Text style={styles.cancelSizeButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {Platform.OS === 'web' && (
        <>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                setSelectedFile(file);
                setImageUri(URL.createObjectURL(file));
              }
            }}
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                setSelectedFile(file);
                setImageUri(URL.createObjectURL(file));
              }
            }}
          />
        </>
      )}
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
  optionsModal: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  optionButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  optionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelOptionButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelOptionButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraModal: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  cameraActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  captureButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  cancelCameraButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelCameraButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceModal: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  deviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  deviceButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  deviceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelDeviceButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelDeviceButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  sizeModal: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  sizeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  sizeText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#555',
  },
  sizeInput: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  sizeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmSizeButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmSizeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelSizeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelSizeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
