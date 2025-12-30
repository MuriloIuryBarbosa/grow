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
import PhotoCarousel from '../components/PhotoCarousel';
import { formatDate, daysBetween } from '../utils/date.utils';
import { Plant } from '../types';
import GrowthChart from '../components/GrowthChart';
import axios from 'axios';

type Props = NativeStackScreenProps<RootStackParamList, 'PlantDetail'>;

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
              {/* Exibir múltiplas fotos se existirem */}
              {record.photos && record.photos.length > 0 && (
                <PhotoCarousel photos={record.photos.map(photo => `${API_BASE_URL}${photo}`)} />
              )}
              {/* Exibir foto única se não há múltiplas fotos mas há photo_path */}
              {(!record.photos || record.photos.length === 0) && record.photo_path && (
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
    backgroundColor: '#fafbfc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fafbfc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#ffffff',
  },
  plantImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: -0.5,
  },
  phaseButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  phaseButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    backgroundColor: '#ffffff',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  phaseButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    elevation: 3,
  },
  phaseButtonDisabled: {
    opacity: 0.5,
    borderColor: '#94a3b8',
    shadowColor: '#94a3b8',
  },
  phaseButtonText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  phaseButtonTextActive: {
    color: '#ffffff',
  },
  markDeadButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  markDeadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBannerDead: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  statusBannerFailed: {
    backgroundColor: '#fff7ed',
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
  },
  statusBannerIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  statusBannerContent: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  statusBannerReason: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  statusBannerDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  reactivateButton: {
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  reactivateButtonText: {
    fontSize: 18,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  newRecordButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  newRecordButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  recordsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  recordCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  recordImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f1f5f9',
  },
  recordContent: {
    padding: 16,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  recordIcon: {
    fontSize: 18,
  },
  recordObservations: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 10,
    lineHeight: 20,
  },
  recordMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  recordMetric: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 16,
    fontWeight: '500',
  },
  emptyStateButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loader: {
    marginVertical: 20,
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  profilePhotoWrapper: {
    position: 'relative',
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#dcfce7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profilePhotoPlaceholderText: {
    fontSize: 40,
    color: '#22c55e',
  },
  editPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10b981',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoLabel: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  // Estilos para Origem Genética
  seedBatchInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  seedBatchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  seedBatchLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  seedBatchValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  originBadge: {
    backgroundColor: '#f0fdf4',
    borderColor: '#dcfce7',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  originBadgeText: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  carouselContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  carouselIndicators: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#ffffff',
    transform: [{ scale: 1.2 }],
  },
  carouselButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -16 }],
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  leftButton: {
    left: 12,
  },
  rightButton: {
    right: 12,
  },
  carouselButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
