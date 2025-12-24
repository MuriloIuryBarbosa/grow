import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from './AppNavigator';
import { plantsAPI } from '../services/api';
import { Plant } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlantAnalysis'>;

export default function PlantAnalysisScreen({ navigation }: Props) {
  const [showDeviceSelection, setShowDeviceSelection] = useState(true);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<MediaDeviceInfo | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [currentSize, setCurrentSize] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showPlantSelection, setShowPlantSelection] = useState(false);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loadingPlants, setLoadingPlants] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (showCamera && videoRef.current && Platform.OS === 'web') {
      const constraints = selectedDevice ? { video: { deviceId: selectedDevice.deviceId } } : { video: true };
      navigator.mediaDevices.getUserMedia(constraints).then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setVideoReady(true);
            startAnalysis();
          };
        }
      }).catch(err => {
        console.error('Error accessing camera:', err);
        Alert.alert('Erro', 'Não foi possível acessar a câmera');
        setShowCamera(false);
      });
    } else {
      setVideoReady(false);
      stopAnalysis();
    }
    return () => stopAnalysis();
  }, [showCamera, selectedDevice]);

  const startAnalysis = useCallback(() => {
    if (analysisIntervalRef.current) return;
    analysisIntervalRef.current = setInterval(() => {
      analyzeCurrentFrame();
    }, 1000); // Analisar a cada 1 segundo
  }, []);

  const stopAnalysis = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
  }, []);

  const analyzeCurrentFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !overlayCanvasRef.current || analyzing) return;

    setAnalyzing(true);
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');

    if (ctx && overlayCtx) {
      // Configurar canvas para análise
      canvas.width = video.videoWidth / 4; // Reduzir resolução
      canvas.height = video.videoHeight / 4;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Configurar overlay canvas
      overlayCanvas.width = video.videoWidth;
      overlayCanvas.height = video.videoHeight;
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let greenPixels = 0;
      const totalPixels = data.length / 4;

      // Analisar pixels e opcionalmente destacar
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (g > r + 20 && g > b + 20 && g > 50) {
          greenPixels++;
          // Opcional: destacar pixels verdes no overlay (mas pode ser pesado)
          // const x = (i / 4) % canvas.width;
          // const y = Math.floor((i / 4) / canvas.width);
          // overlayCtx.fillStyle = 'rgba(0,255,0,0.3)';
          // overlayCtx.fillRect(x * 4, y * 4, 4, 4);
        }
      }

      const greenRatio = greenPixels / totalPixels;
      const estimatedSize = Math.max(5, Math.min(100, 10 + (greenRatio * 80)));

      setCurrentSize(Math.round(estimatedSize * 10) / 10);

      // Desenhar régua virtual
      drawVirtualRuler(overlayCtx, overlayCanvas.width, overlayCanvas.height, estimatedSize);
    }
    setAnalyzing(false);
  }, [analyzing]);

  const drawVirtualRuler = (ctx: CanvasRenderingContext2D, width: number, height: number, sizeCm: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Assumir uma escala: 1cm = 50 pixels (ajustável)
    const pixelsPerCm = 50;
    const rulerLength = sizeCm * pixelsPerCm;
    
    // Desenhar régua horizontal no centro
    const startX = centerX - rulerLength / 2;
    const endX = centerX + rulerLength / 2;
    const rulerY = centerY;
    
    // Linha principal
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, rulerY);
    ctx.lineTo(endX, rulerY);
    ctx.stroke();
    
    // Marcas a cada 1cm
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    for (let i = 0; i <= sizeCm; i++) {
      const x = startX + (i * pixelsPerCm);
      ctx.beginPath();
      ctx.moveTo(x, rulerY - 10);
      ctx.lineTo(x, rulerY + 10);
      ctx.stroke();
      
      // Texto
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px Arial';
      ctx.fillText(`${i}cm`, x - 10, rulerY - 15);
    }
    
    // Texto do tamanho total
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Tamanho: ${sizeCm}cm`, centerX - 60, centerY + 40);
  };

  const selectDevice = (device: MediaDeviceInfo) => {
    setSelectedDevice(device);
    setShowDeviceSelection(false);
    setShowCamera(true);
  };

  const stopCamera = () => {
    setShowCamera(false);
    setVideoReady(false);
    setCurrentSize(null);
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const useDataForRecord = async () => {
    if (!currentSize) {
      Alert.alert('Erro', 'Nenhum tamanho detectado');
      return;
    }

    setLoadingPlants(true);
    try {
      const plantsData = await plantsAPI.getAll();
      setPlants(plantsData);
      setShowPlantSelection(true);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as plantas');
    } finally {
      setLoadingPlants(false);
    }
  };

  const selectPlant = (plant: Plant) => {
    setShowPlantSelection(false);
    stopCamera();
    // Navegar para NewRecordScreen com dados preenchidos
    navigation.navigate('NewRecord', {
      plantId: plant.id!,
      prefilledSize: currentSize,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Análise de Planta</Text>

      {showDeviceSelection && Platform.OS === 'web' && (
        <View style={styles.deviceModal}>
          <View style={styles.deviceContainer}>
            <Text style={styles.deviceTitle}>Selecionar Câmera</Text>
            {videoDevices.map(device => (
              <TouchableOpacity key={device.deviceId} style={styles.deviceButton} onPress={() => selectDevice(device)}>
                <Text style={styles.deviceButtonText}>{device.label || `Câmera ${device.deviceId.slice(0,8)}`}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelDeviceButton} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelDeviceButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showCamera && Platform.OS === 'web' && (
        <View style={styles.cameraContainer}>
          <View style={styles.videoContainer}>
            <video ref={videoRef} autoPlay style={{ width: '100%', height: 300, borderRadius: 8 }} />
            <canvas 
              ref={overlayCanvasRef} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: 300, 
                borderRadius: 8,
                pointerEvents: 'none'
              }} 
            />
          </View>
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <View style={styles.analysisContainer}>
            <Text style={styles.analysisTitle}>Tamanho Estimado da Planta:</Text>
            <Text style={styles.sizeText}>
              {currentSize ? `${currentSize} cm` : 'Analisando...'}
            </Text>
            {analyzing && <ActivityIndicator size="small" color="#4CAF50" />}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.useDataButton} onPress={useDataForRecord} disabled={!currentSize || loadingPlants}>
              <Text style={styles.useDataButtonText}>
                {loadingPlants ? 'Carregando...' : '📝 Usar Dados'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopButton} onPress={stopCamera}>
              <Text style={styles.stopButtonText}>Parar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showPlantSelection && (
        <Modal visible={showPlantSelection} animationType="slide">
          <View style={styles.plantSelectionContainer}>
            <Text style={styles.plantSelectionTitle}>Selecionar Planta</Text>
            <ScrollView style={styles.plantsList}>
              {plants.map(plant => (
                <TouchableOpacity
                  key={plant.id}
                  style={styles.plantItem}
                  onPress={() => selectPlant(plant)}
                >
                  <Text style={styles.plantItemText}>
                    {plant.code} - {plant.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelPlantSelection}
              onPress={() => setShowPlantSelection(false)}
            >
              <Text style={styles.cancelPlantSelectionText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
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
  cameraContainer: {
    flex: 1,
  },
  videoContainer: {
    position: 'relative',
  },
  analysisContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
    alignItems: 'center',
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  sizeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  useDataButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  useDataButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: '#f44336',
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  plantSelectionContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  plantSelectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  plantsList: {
    flex: 1,
  },
  plantItem: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  plantItemText: {
    fontSize: 16,
    color: '#333',
  },
  cancelPlantSelection: {
    backgroundColor: '#ddd',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  cancelPlantSelectionText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});