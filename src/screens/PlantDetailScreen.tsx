import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { usePlant } from '../hooks/usePlants';
import { useRecords } from '../hooks/useRecords';
import { plantsAPI, API_BASE_URL } from '../services/api';
import { formatDate, daysBetween } from '../utils/date.utils';
import { Plant } from '../types';
import GrowthChart from '../components/GrowthChart';
import axios from 'axios';

type Props = NativeStackScreenProps<RootStackParamList, 'PlantDetail'>;

const PhotoCarousel = ({ photos }: { photos: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width } = Dimensions.get('window');

  if (!photos || photos.length === 0) return null;

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <View style={styles.carouselContainer}>
      <Image
        source={{ uri: `${API_BASE_URL}${photos[currentIndex]}` }}
        style={[styles.recordImage, { width: width * 0.8 }]}
        resizeMode="cover"
      />
      {photos.length > 1 && (
        <>
          <View style={styles.carouselIndicators}>
            {photos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentIndex && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
          <TouchableOpacity style={[styles.carouselButton, styles.leftButton]} onPress={prevPhoto}>
            <Text style={styles.carouselButtonText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.carouselButton, styles.rightButton]} onPress={nextPhoto}>
            <Text style={styles.carouselButtonText}>›</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

export default function PlantDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { plant, loading, error, refetch } = usePlant(id);
  const { records, loading: recordsLoading, refetch: refetchRecords } = useRecords(id);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchRecords()]);
    setRefreshing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Planta',
      'Tem certeza que deseja excluir esta planta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await plantsAPI.delete(id);
              navigation.navigate('Home');
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível excluir a planta');
            }
          },
        },
      ]
    );
  };

  const handlePhaseChange = async (phase: Plant['current_phase']) => {
    try {
      await plantsAPI.updatePhase(id, phase);
      await refetch();
      Alert.alert('Sucesso', 'Fase atualizada com sucesso');
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível atualizar a fase');
    }
  };

  const handleMarkAsDead = () => {
    if (plant?.status === 'morta') {
      // Reativar planta
      Alert.alert(
        'Reativar Planta',
        'Deseja reativar esta planta?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Reativar',
            onPress: async () => {
              try {
                await plantsAPI.updateStatus(id, 'ativa');
                await refetch();
                Alert.alert('Sucesso', 'Planta reativada!');
              } catch (err) {
                Alert.alert('Erro', 'Não foi possível reativar a planta');
              }
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      '💀 Marcar como Morta',
      'Escolha o motivo:',
      [
        {
          text: 'Falha na Germinação',
          onPress: () => confirmMarkAsDead('falha_germinacao', 'Falha na germinação'),
        },
        {
          text: 'Praga/Doença',
          onPress: () => confirmMarkAsDead('morta', 'Praga ou doença'),
        },
        {
          text: 'Erro de Cultivo',
          onPress: () => confirmMarkAsDead('morta', 'Erro de cultivo'),
        },
        {
          text: 'Outro Motivo',
          onPress: () => confirmMarkAsDead('morta', 'Outro motivo'),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const confirmMarkAsDead = (status: 'morta' | 'falha_germinacao', reason: string) => {
    Alert.alert(
      'Confirmar',
      `Tem certeza que deseja marcar esta planta como ${status === 'falha_germinacao' ? 'falha na germinação' : 'morta'}?\n\nMotivo: ${reason}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            try {
              await plantsAPI.updateStatus(id, status, reason);
              await refetch();
              Alert.alert('Sucesso', 'Status atualizado');
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível atualizar o status');
            }
          },
        },
      ]
    );
  };

  const handleProfilePhoto = async () => {
    Alert.alert(
      'Foto de Perfil',
      'Escolha uma opção:',
      [
        {
          text: 'Câmera',
          onPress: () => takeProfilePhoto(),
        },
        {
          text: 'Galeria',
          onPress: () => pickProfilePhoto(),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const takeProfilePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'É necessário permitir o acesso à câmera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await cropAndUploadPhoto(result.assets[0].uri);
    }
  };

  const pickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'É necessário permitir o acesso à galeria');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await cropAndUploadPhoto(result.assets[0].uri);
    }
  };

  const cropAndUploadPhoto = async (uri: string) => {
    try {
      // Crop para 1:1 (quadrado)
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: 400,
              height: 400,
            },
          },
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      setUploadingPhoto(true);

      // Upload da foto
      const formData = new FormData();
      formData.append('photo', {
        uri: manipulatedImage.uri,
        type: 'image/jpeg',
        name: `profile_${id}_${Date.now()}.jpg`,
      } as any);

      const uploadResponse = await axios.post(
        `${API_BASE_URL}/api/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const photoPath = uploadResponse.data.photoPath;

      // Atualizar foto de perfil da planta
      await plantsAPI.updateProfilePhoto(id, photoPath);
      await refetch();

      Alert.alert('Sucesso', 'Foto de perfil atualizada com sucesso');
    } catch (err) {
      console.error('Erro ao fazer upload da foto:', err);
      Alert.alert('Erro', 'Não foi possível atualizar a foto de perfil');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const calculateStats = () => {
    if (!plant) return { totalDays: 0, daysFromGermination: null, currentPhaseDays: 0 };

    const totalDays = plant.planting_date ? daysBetween(plant.planting_date) : 0;
    const daysFromGermination = plant.germination_date ? daysBetween(plant.germination_date) : null;

    let currentPhaseDays = 0;
    if (plant.phase_history && plant.phase_history.length > 0) {
      const currentPhase = plant.phase_history.find(
        h => h.phase === plant.current_phase && !h.ended_at
      );
      if (currentPhase?.started_at) {
        currentPhaseDays = daysBetween(currentPhase.started_at);
      }
    }

    return { totalDays, daysFromGermination, currentPhaseDays };
  };

  const getPhaseStartDates = () => {
    if (!plant?.phase_history) return { mudaStartDate: null, vegetacaoStartDate: null };

    const mudaPhase = plant.phase_history.find(h => h.phase === 'muda');
    const vegetacaoPhase = plant.phase_history.find(h => h.phase === 'vegetacao');

    return {
      mudaStartDate: mudaPhase?.started_at || null,
      vegetacaoStartDate: vegetacaoPhase?.started_at || null,
    };
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'germinacao': return '🌱 Germinação';
      case 'muda': return '🌿 Muda';
      case 'vegetacao': return '🌿 Vegetativa';
      case 'floracao': return '🌸 Floração';
      default: return phase;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Carregando planta...</Text>
      </View>
    );
  }

  if (error || !plant) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ {error || 'Planta não encontrada'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = calculateStats();
  const phaseDates = getPhaseStartDates();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Banner de Status Morta */}
      {plant.status !== 'ativa' && (
        <View style={[styles.statusBanner, plant.status === 'morta' ? styles.statusBannerDead : styles.statusBannerFailed]}>
          <Text style={styles.statusBannerIcon}>
            {plant.status === 'morta' ? '💀' : '❌'}
          </Text>
          <View style={styles.statusBannerContent}>
            <Text style={styles.statusBannerTitle}>
              {plant.status === 'morta' ? 'Planta Morta' : 'Falha na Germinação'}
            </Text>
            {plant.failure_reason && (
              <Text style={styles.statusBannerReason}>{plant.failure_reason}</Text>
            )}
            {plant.failure_date && (
              <Text style={styles.statusBannerDate}>
                Data: {formatDate(plant.failure_date)}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.reactivateButton} onPress={handleMarkAsDead}>
            <Text style={styles.reactivateButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header com ações */}
      <View style={styles.header}>
        <Text style={styles.title}>{plant.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditPlant', { id })}
          >
            <Text style={styles.editButtonText}>✏️ Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Foto de Perfil */}
      <View style={styles.profilePhotoContainer}>
        <TouchableOpacity
          style={styles.profilePhotoWrapper}
          onPress={handleProfilePhoto}
          disabled={uploadingPhoto}
        >
          {plant.profile_photo ? (
            <Image
              source={{ uri: `${API_BASE_URL}${plant.profile_photo}` }}
              style={styles.profilePhoto}
            />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Text style={styles.profilePhotoPlaceholderText}>🌱</Text>
            </View>
          )}
          {uploadingPhoto ? (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : (
            <View style={styles.editPhotoOverlay}>
              <Text style={styles.editPhotoText}>📷</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.profilePhotoLabel}>Toque para alterar a foto de perfil</Text>
      </View>

      {/* Foto da planta */}
      {plant.photo_path && (
        <Image
          source={{ uri: `${API_BASE_URL}${plant.photo_path}` }}
          style={styles.plantImage}
          resizeMode="cover"
        />
      )}

      {/* Origem Genética - Lote de Sementes */}
      {plant.seed_batch_id && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🧬 Origem Genética</Text>
          <View style={styles.seedBatchInfo}>
            <View style={styles.seedBatchRow}>
              <Text style={styles.seedBatchLabel}>Lote de Sementes:</Text>
              <Text style={styles.seedBatchValue}>{plant.seed_batch_code || 'N/A'}</Text>
            </View>
            {plant.genetic_strain_name && (
              <View style={styles.seedBatchRow}>
                <Text style={styles.seedBatchLabel}>Genética:</Text>
                <Text style={styles.seedBatchValue}>{plant.genetic_strain_name}</Text>
              </View>
            )}
            {plant.genetic_breeder && (
              <View style={styles.seedBatchRow}>
                <Text style={styles.seedBatchLabel}>Breeder:</Text>
                <Text style={styles.seedBatchValue}>{plant.genetic_breeder}</Text>
              </View>
            )}
            <View style={styles.seedBatchRow}>
              <Text style={styles.seedBatchLabel}>Origem:</Text>
              <View style={styles.originBadge}>
                <Text style={styles.originBadgeText}>🌱 Semente</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Informações básicas */}
      <View style={styles.card}>
        <View style={styles.infoGrid}>
          <InfoItem label="Código" value={plant.code} />
          {plant.genetic && <InfoItem label="Genética" value={plant.genetic} />}
          <InfoItem label="Substrato" value={plant.substrate} />
          {plant.current_location && (
            <InfoItem label="Localização" value={plant.current_location} />
          )}
          <InfoItem
            label="Data de Plantio"
            value={plant.planting_date ? formatDate(plant.planting_date) : 'N/A'}
          />
          {plant.germination_date && (
            <InfoItem
              label="Data de Germinação"
              value={formatDate(plant.germination_date)}
            />
          )}
          {phaseDates.mudaStartDate && (
            <InfoItem
              label="Início da Muda"
              value={formatDate(phaseDates.mudaStartDate)}
            />
          )}
          {phaseDates.vegetacaoStartDate && (
            <InfoItem
              label="Início da Vegetação"
              value={formatDate(phaseDates.vegetacaoStartDate)}
            />
          )}
        </View>
      </View>

      {/* Estatísticas de tempo */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>⏱️ Tempo de Vida</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Total desde Plantio" value={`${stats.totalDays} dias`} />
          {stats.daysFromGermination !== null && (
            <StatCard label="Desde Germinação" value={`${stats.daysFromGermination} dias`} />
          )}
          {stats.currentPhaseDays >= 0 && (
            <StatCard
              label={
                plant.current_phase === 'germinacao' ? 'Em Germinação' :
                plant.current_phase === 'muda' ? 'Em Muda' :
                plant.current_phase === 'vegetacao' ? 'Em Vegetação' :
                'Em Floração'
              }
              value={`${stats.currentPhaseDays} dias`}
            />
          )}
        </View>
      </View>

      {/* Botões de mudança de fase */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Alterar Fase</Text>
        <View style={styles.phaseButtons}>
          {(['germinacao', 'muda', 'vegetacao', 'floracao'] as const).map(phase => (
            <TouchableOpacity
              key={phase}
              style={[
                styles.phaseButton,
                plant.current_phase === phase && styles.phaseButtonActive,
                plant.status !== 'ativa' && styles.phaseButtonDisabled,
              ]}
              onPress={() => handlePhaseChange(phase)}
              disabled={plant.status !== 'ativa'}
            >
              <Text
                style={[
                  styles.phaseButtonText,
                  plant.current_phase === phase && styles.phaseButtonTextActive,
                ]}
              >
                {getPhaseLabel(phase)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Botão Marcar como Morta */}
        {plant.status === 'ativa' && (
          <TouchableOpacity
            style={styles.markDeadButton}
            onPress={handleMarkAsDead}
          >
            <Text style={styles.markDeadButtonText}>💀 Marcar como Morta</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Gráfico de Evolução */}
      {records.length > 0 && (
        <GrowthChart records={records} plant={plant} />
      )}

      {/* Registros Diários */}
      <View style={styles.recordsHeader}>
        <Text style={styles.sectionTitle}>📊 Registros Diários</Text>
        <TouchableOpacity
          style={styles.newRecordButton}
          onPress={() => navigation.navigate('NewRecord', { plantId: id })}
        >
          <Text style={styles.newRecordButtonText}>➕ Novo</Text>
        </TouchableOpacity>
      </View>

      {recordsLoading ? (
        <ActivityIndicator size="small" color="#4CAF50" style={styles.loader} />
      ) : records.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>📊 Nenhum registro ainda</Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate('NewRecord', { plantId: id })}
          >
            <Text style={styles.emptyStateButtonText}>Criar Primeiro Registro</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.recordsList}>
          {records.map(record => (
            <TouchableOpacity
              key={record.id}
              style={styles.recordCard}
              onPress={() => navigation.navigate('EditRecord', { plantId: id, recordId: record.id! })}
            >
              {(record.photos && record.photos.length > 0) && (
                <PhotoCarousel photos={record.photos} />
              )}
              {!record.photos && record.photo_path && (
                <Image
                  source={{ uri: `${API_BASE_URL}${record.photo_path}` }}
                  style={styles.recordImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.recordContent}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordDate}>{formatDate(record.record_date)}</Text>
                  {((record.photos && record.photos.length > 0) || record.photo_path) && <Text style={styles.recordIcon}>📷</Text>}
                </View>
                {record.observations && (
                  <Text style={styles.recordObservations} numberOfLines={2}>
                    {record.observations}
                  </Text>
                )}
                <View style={styles.recordMetrics}>
                  {record.plant_size !== undefined && record.plant_size !== null && (
                    <Text style={styles.recordMetric}>📏 {record.plant_size}cm</Text>
                  )}
                  {record.leaf_count !== undefined && record.leaf_count !== null && (
                    <Text style={styles.recordMetric}>🍃 {record.leaf_count}</Text>
                  )}
                  {record.branch_count !== undefined && record.branch_count !== null && (
                    <Text style={styles.recordMetric}>🌿 {record.branch_count}</Text>
                  )}
                  {record.ppfd !== undefined && record.ppfd !== null && (
                    <Text style={styles.recordMetric}>💡 {record.ppfd}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  plantImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#e0e0e0',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  phaseButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  phaseButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
    backgroundColor: '#fff',
  },
  phaseButtonActive: {
    backgroundColor: '#4CAF50',
  },
  phaseButtonDisabled: {
    opacity: 0.5,
    borderColor: '#999',
  },
  phaseButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  phaseButtonTextActive: {
    color: '#fff',
  },
  markDeadButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ff5252',
    borderRadius: 8,
    alignItems: 'center',
  },
  markDeadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  statusBannerDead: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  statusBannerFailed: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  statusBannerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  statusBannerContent: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBannerReason: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBannerDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  reactivateButton: {
    padding: 8,
    backgroundColor: '#e8f5e9',
    borderRadius: 20,
  },
  reactivateButtonText: {
    fontSize: 20,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  newRecordButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  newRecordButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  recordsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  recordImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
  },
  recordContent: {
    padding: 16,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  recordIcon: {
    fontSize: 18,
  },
  recordObservations: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  recordMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  recordMetric: {
    fontSize: 14,
    color: '#4CAF50',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 20,
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profilePhotoWrapper: {
    position: 'relative',
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  profilePhotoPlaceholderText: {
    fontSize: 48,
  },
  editPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  editPhotoText: {
    fontSize: 18,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  // Estilos para Origem Genética
  seedBatchInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  seedBatchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  seedBatchLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  seedBatchValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  originBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  originBadgeText: {
    fontSize: 12,
    color: '#2d5016',
    fontWeight: '600',
  },
  carouselContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  carouselIndicators: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#fff',
  },
  carouselButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -15 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftButton: {
    left: 10,
  },
  rightButton: {
    right: 10,
  },
  carouselButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
