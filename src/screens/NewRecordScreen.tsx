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
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
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
      const uploadFormData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          uploadFormData.append(key, value);
        }
      });
      uploadFormData.append('plant_id', plantId);
      console.log('Selected files count:', selectedFiles.length);
      // Adicionar todas as fotos
      selectedFiles.forEach((file) => {
        uploadFormData.append('photos', file);
      });

      await axios.post(
        `${API_BASE_URL}/api/records`,
        uploadFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
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
      const uri = result.assets[0].uri;
      setImageUris(prev => [...prev, uri]);

      // Adicionar para upload
      const fileName = `photo-${Date.now()}.jpg`;
      const fileObj = { uri, name: fileName, type: 'image/jpeg' };
      setSelectedFiles(prev => [...prev, fileObj]);
    }
  };

  const pickImage = async () => {
    console.log('🎯 pickImage called');
    try {
      // Verificar se o ImagePicker está disponível
      if (!ImagePicker.launchImageLibraryAsync) {
        console.error('❌ ImagePicker.launchImageLibraryAsync not available');
        Alert.alert('Erro', 'Seletor de imagens não disponível neste dispositivo');
        return;
      }

      console.log('📱 Requesting media library permissions...');
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📱 Media library permission status:', mediaStatus);

      if (mediaStatus !== 'granted') {
        console.log('❌ Permission denied');
        Alert.alert(
          'Permissão necessária',
          'Precisamos de permissão para acessar suas fotos. Vá em Configurações > Apps > ShuriGrow > Permissões e permita acesso às fotos.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Tentar novamente',
              onPress: () => pickImage()
            }
          ]
        );
        return;
      }

      console.log('📸 Launching image library with simplified config...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: undefined,
        exif: false,
      });

      console.log('📸 Raw result:', JSON.stringify(result, null, 2));

      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map(a => a.uri);
        console.log('🖼️ Selected images URIs:', uris);
        setImageUris(prev => [...prev, ...uris]);

        // Converter assets para objetos para upload
        if (Platform.OS === 'web') {
          try {
            const files = await Promise.all(
              result.assets.map(async (asset, index) => {
                console.log(`📄 Converting asset ${index} to File...`);
                const response = await fetch(asset.uri);
                const blob = await response.blob();
                const fileName = asset.fileName || `photo-${Date.now()}-${index}.jpg`;
                return new File([blob], fileName, { type: 'image/jpeg' });
              })
            );
            console.log('📄 Converted files:', files);
            setSelectedFiles(prev => [...prev, ...files]);
          } catch (fileError) {
            console.error('💥 Error converting to files:', fileError);
            Alert.alert('Erro', 'Não foi possível processar as imagens selecionadas');
          }
        } else {
          const files = result.assets.map((asset, index) => ({
            uri: asset.uri,
            name: asset.fileName || `photo-${Date.now()}-${index}.jpg`,
            type: 'image/jpeg',
          }));
          setSelectedFiles(prev => [...prev, ...files]);
        }

        Alert.alert('Sucesso', `${uris.length} imagem(ns) selecionada(s)`);
      } else {
        console.log('❌ No images selected or picker canceled');
      }
    } catch (error) {
      console.error('💥 Error in pickImage:', error);
      Alert.alert(
        'Erro',
        `Não foi possível acessar a galeria: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        [
          { text: 'OK' },
          {
            text: 'Tentar novamente',
            onPress: () => pickImage()
          }
        ]
      );
    }
  };

  const removePhoto = (idx: number) => {
    setImageUris(prev => prev.filter((_, i) => i !== idx));
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
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
                setSelectedFiles(prev => [...prev, file]);
                setImageUris(prev => [...prev, URL.createObjectURL(file)]);
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
              setSelectedFiles(prev => [...prev, file]);
              setImageUris(prev => [...prev, URL.createObjectURL(file)]);
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
    setSelectedFiles(prev => []);
    setImageUris(prev => []);
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
          <Text style={styles.label}>Fotos</Text>
          <ScrollView horizontal>
            {imageUris.map((uri, idx) => (
              <View key={uri} style={{ marginRight: 8 }}>
                <Image source={{ uri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={[styles.button, styles.removePhotoButton]}
                  onPress={() => removePhoto(idx)}
                >
                  <Text style={styles.removePhotoButtonText}>🗑️ Remover</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.button, styles.addPhotoButton]}
              onPress={showPhotoOptions}
            >
              <Text style={styles.addPhotoButtonText}>📷 Adicionar Foto</Text>
            </TouchableOpacity>
          </ScrollView>
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
            multiple
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = Array.from((e.target as HTMLInputElement).files || []);
              setSelectedFiles(prev => [...prev, ...files]);
              setImageUris(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
            }}
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            ref={cameraInputRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = Array.from((e.target as HTMLInputElement).files || []);
              setSelectedFiles(prev => [...prev, ...files]);
              setImageUris(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
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
    backgroundColor: '#fafbfc',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  button: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.3,
  },
  submitButton: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.2,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  photoPreview: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  addPhotoButton: {
    backgroundColor: '#10b981',
    borderWidth: 0,
    shadowColor: '#10b981',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  addPhotoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  changePhotoButton: {
    backgroundColor: '#10b981',
    borderWidth: 0,
    flex: 1,
    shadowColor: '#10b981',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  changePhotoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  removePhotoButton: {
    backgroundColor: '#ef4444',
    borderWidth: 0,
    flex: 1,
    shadowColor: '#ef4444',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  removePhotoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.3,
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  optionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  optionButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  optionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cancelOptionButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cancelOptionButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cameraTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  cameraActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  captureButton: {
    backgroundColor: '#10b981',
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  captureButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  cancelCameraButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cancelCameraButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  deviceTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  deviceButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cancelDeviceButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cancelDeviceButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sizeTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  sizeText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#64748b',
    fontWeight: '500',
  },
  sizeInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sizeActions: {
    flexDirection: 'row',
    gap: 16,
  },
  confirmSizeButton: {
    backgroundColor: '#10b981',
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmSizeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cancelSizeButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cancelSizeButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
