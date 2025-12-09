import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { readingsAPI } from '../services/api';

interface DailyAverage {
  sensor_id: number;
  sensor_name: string;
  location: string;
  date: string;
  avg_temperature?: number;
  avg_humidity?: number;
  min_temperature?: number;
  max_temperature?: number;
  min_humidity?: number;
  max_humidity?: number;
  reading_count: number;
}

export default function SensorDashboard() {
  const [averages, setAverages] = useState<DailyAverage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAverages();
  }, []);

  const loadAverages = async () => {
    try {
      const data = await readingsAPI.getDailyAverages(7);
      setAverages(data);
    } catch (error) {
      console.error('Erro ao carregar médias:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupBySensor = () => {
    const grouped: { [key: number]: DailyAverage[] } = {};
    averages.forEach(avg => {
      if (!grouped[avg.sensor_id]) {
        grouped[avg.sensor_id] = [];
      }
      grouped[avg.sensor_id].push(avg);
    });
    return grouped;
  };

  const calculateOverallAverages = (sensorData: DailyAverage[]) => {
    const temps = sensorData.filter(d => d.avg_temperature !== null).map(d => d.avg_temperature!);
    const humids = sensorData.filter(d => d.avg_humidity !== null).map(d => d.avg_humidity!);
    
    return {
      avgTemp: temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
      avgHumid: humids.length > 0 ? humids.reduce((a, b) => a + b, 0) / humids.length : null,
      minTemp: temps.length > 0 ? Math.min(...temps) : null,
      maxTemp: temps.length > 0 ? Math.max(...temps) : null,
      minHumid: humids.length > 0 ? Math.min(...humids) : null,
      maxHumid: humids.length > 0 ? Math.max(...humids) : null,
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#4CAF50" />
        <Text style={styles.loadingText}>Carregando dados dos sensores...</Text>
      </View>
    );
  }

  if (averages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>📊 Nenhuma leitura nos últimos 7 dias</Text>
      </View>
    );
  }

  const groupedData = groupBySensor();

  return (
    <ScrollView style={styles.container} horizontal showsHorizontalScrollIndicator={false}>
      {Object.entries(groupedData).map(([sensorId, sensorData]) => {
        const stats = calculateOverallAverages(sensorData);
        const sensorInfo = sensorData[0];

        return (
          <View key={sensorId} style={styles.sensorCard}>
            <Text style={styles.sensorName}>{sensorInfo.sensor_name}</Text>
            <Text style={styles.sensorLocation}>📍 {sensorInfo.location}</Text>
            <Text style={styles.periodText}>Últimos 7 dias</Text>

            {stats.avgTemp !== null && (
              <View style={styles.metricContainer}>
                <Text style={styles.metricLabel}>🌡️ Temperatura</Text>
                <Text style={styles.metricValue}>{stats.avgTemp.toFixed(1)}°C</Text>
                <Text style={styles.metricRange}>
                  Min: {stats.minTemp!.toFixed(1)}°C | Máx: {stats.maxTemp!.toFixed(1)}°C
                </Text>
              </View>
            )}

            {stats.avgHumid !== null && (
              <View style={styles.metricContainer}>
                <Text style={styles.metricLabel}>💧 Umidade</Text>
                <Text style={styles.metricValue}>{stats.avgHumid.toFixed(1)}%</Text>
                <Text style={styles.metricRange}>
                  Min: {stats.minHumid!.toFixed(1)}% | Máx: {stats.maxHumid!.toFixed(1)}%
                </Text>
              </View>
            )}

            <Text style={styles.readingsCount}>
              {sensorData.reduce((sum, d) => sum + d.reading_count, 0)} leituras
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  sensorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 280,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sensorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sensorLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  periodText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  metricContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  metricRange: {
    fontSize: 12,
    color: '#888',
  },
  readingsCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
