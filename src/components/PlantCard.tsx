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
  const [pressed, setPressed] = useState(false);

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
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      activeOpacity={0.9}
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
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f8fafc',
    overflow: 'hidden',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAlert: {
    borderColor: '#fed7aa',
    backgroundColor: '#fffbeb',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.12,
  },
  cardDead: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    shadowColor: '#ef4444',
    shadowOpacity: 0.12,
  },
  cardFailed: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    shadowColor: '#f97316',
    shadowOpacity: 0.12,
  },
  deadBadge: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  failedBadge: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderWidth: 1,
  },
  deadBadgeText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  alertBadge: {
    backgroundColor: '#fffbeb',
    borderColor: '#fed7aa',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  alertText: {
    color: '#d97706',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cardContent: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profilePhoto: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profilePhotoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dcfce7',
  },
  placeholderText: {
    fontSize: 28,
    color: '#22c55e',
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  cardCode: {
    fontSize: 11,
    color: '#64748b',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  cardBody: {
    gap: 6,
  },
  cardDetail: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 18,
  },
  label: {
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.3,
  },
});
