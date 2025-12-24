import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { sensorsAPI } from '../services/api';
import { Sensor } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Sensors'>;

export default function SensorsScreen({ navigation }: Props) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSensors = async () => {
    try {
      const data = await sensorsAPI.getAll();
      setSensors(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os sensores');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSensors();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSensors();
  };

  const getSensorTypeLabel = (type: string) => {
    switch (type) {
      case 'temperature':
        return '🌡️ Temperatura';
      case 'humidity':
        return '💧 Umidade';
      case 'temperature_humidity':
        return '🌡️💧 Temp. e Umid.';
      default:
        return type;
    }
  };

  const toggleSensor = async (sensor: Sensor) => {
    try {
      await sensorsAPI.update(sensor.id!, { is_active: sensor.is_active === 1 ? 0 : 1 });
      await loadSensors();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o sensor');
    }
  };

  const renderSensor = ({ item }: { item: Sensor }) => (
    <TouchableOpacity
      style={styles.sensorCard}
      onPress={() => navigation.navigate('NewSensorReading', { sensor_id: item.id!, sensor_name: item.name })}
    >
      <View style={styles.sensorHeader}>
        <View style={styles.sensorInfo}>
          <Text style={styles.sensorName}>{item.name}</Text>
          <Text style={styles.sensorType}>{getSensorTypeLabel(item.type)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}
          onPress={() => toggleSensor(item)}
        >
          <Text style={styles.statusText}>
            {item.is_active ? '✓ Ativo' : '○ Inativo'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.sensorDetails}>
        <Text style={styles.locationText}>📍 {item.location}</Text>
        {item.description && (
          <Text style={styles.descriptionText}>{item.description}</Text>
        )}
      </View>

      <View style={styles.addReadingButton}>
        <Text style={styles.addReadingButtonText}>➕ Adicionar Leitura</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Carregando sensores...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌡️ Sensores</Text>
        <Text style={styles.subtitle}>{sensors.length} sensor(es) cadastrado(s)</Text>
      </View>

      {sensors.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>📭 Nenhum sensor cadastrado</Text>
          <Text style={styles.emptySubtext}>
            Os sensores registrados aparecerão aqui
          </Text>
        </View>
      ) : (
        <FlatList
          data={sensors}
          keyExtractor={(item) => item.id!.toString()}
          renderItem={renderSensor}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  sensorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sensorInfo: {
    flex: 1,
  },
  sensorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sensorType: {
    fontSize: 14,
    color: '#4CAF50',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  inactiveBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  sensorDetails: {
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  addReadingButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  addReadingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});

