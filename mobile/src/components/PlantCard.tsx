import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Plant } from '../types';
import { formatDateLocal } from '../utils/date.utils';
import { recordsAPI, API_BASE_URL } from '../services/api';

interface PlantCardProps {
  plant: Plant;
  onPress: () => void;
}

const PHASE_LABELS = {
  germinacao: '🌱 Germinação',
  muda: '🌿 Muda',
  vegetacao: '🌳 Vegetação',
  floracao: '🌸 Floração',
};

const STATUS_LABELS = {
  ativa: '✅ Ativa',
  morta: '❌ Morta',
  falha_germinacao: '⚠️ Falha na germinação',
};

export default function PlantCard({ plant, onPress }: PlantCardProps) {
  const [hasRecordToday, setHasRecordToday] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTodayRecord();
  }, [plant.id]);

  const checkTodayRecord = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const records = await recordsAPI.getByPlant(plant.id!);
      
      const todayRecord = records.some(record => 
        record.record_date.split('T')[0] === today
      );
      
      setHasRecordToday(todayRecord);
    } catch (error) {
      console.error('Erro ao verificar registro de hoje:', error);
    } finally {
      setLoading(false);
    }
  };

  const profilePhotoUrl = plant.profile_photo 
    ? `${API_BASE_URL}${plant.profile_photo}`
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.card, 
        !hasRecordToday && !loading && plant.status === 'ativa' && styles.cardAlert,
        plant.status === 'morta' && styles.cardDead,
        plant.status === 'falha_germinacao' && styles.cardFailed,
      ]}
      onPress={onPress}
    >
      {plant.status !== 'ativa' && (
        <View style={[styles.deadBadge, plant.status === 'falha_germinacao' && styles.failedBadge]}>
          <Text style={styles.deadBadgeText}>
            {plant.status === 'morta' ? '💀 Morta' : '❌ Falha'}
          </Text>
        </View>
      )}
      {!hasRecordToday && !loading && plant.status === 'ativa' && (
        <View style={styles.alertBadge}>
          <Text style={styles.alertText}>⚠️ Sem registro hoje</Text>
        </View>
      )}
      
      <View style={styles.cardContent}>
        {profilePhotoUrl ? (
          <Image source={{ uri: profilePhotoUrl }} style={styles.profilePhoto} />
        ) : (
          <View style={styles.profilePhotoPlaceholder}>
            <Text style={styles.placeholderText}>🌱</Text>
          </View>
        )}

        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{plant.name}</Text>
            <Text style={styles.cardCode}>{plant.code}</Text>
          </View>
          
          <View style={styles.cardBody}>
            <Text style={styles.cardDetail}>
              <Text style={styles.label}>Fase:</Text> {PHASE_LABELS[plant.current_phase]}
            </Text>
            <Text style={styles.cardDetail}>
              <Text style={styles.label}>Status:</Text> {STATUS_LABELS[plant.status]}
            </Text>
            <Text style={styles.cardDetail}>
              <Text style={styles.label}>Plantio:</Text> {formatDateLocal(plant.planting_date)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardAlert: {
    borderWidth: 2,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  cardDead: {
    borderWidth: 2,
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
    opacity: 0.8,
  },
  cardFailed: {
    borderWidth: 2,
    borderColor: '#f97316',
    backgroundColor: '#fff7ed',
    opacity: 0.8,
  },
  deadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  failedBadge: {
    backgroundColor: '#f97316',
  },
  deadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  alertBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  alertText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
  },
  profilePhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 36,
  },
  cardInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  cardCode: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardBody: {
    gap: 4,
  },
  cardDetail: {
    fontSize: 14,
    color: '#4b5563',
  },
  label: {
    fontWeight: '600',
    color: '#374151',
  },
});
