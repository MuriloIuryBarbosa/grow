import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Plant, DailyRecord } from '../types';
import { recordsAPI } from '../services/api';

interface PlantRankingProps {
  plants: Plant[];
  onPlantPress: (plantId: number) => void;
}

interface PlantRankingData {
  plant: Plant;
  latestRecord: DailyRecord | null;
  maxSize: number;
  maxLeaves: number;
  maxBranches: number;
  totalScore: number;
}

const POSITION_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']; // Ouro, Prata, Bronze

export default function PlantRanking({ plants, onPlantPress }: PlantRankingProps) {
  const [allRecords, setAllRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllRecords();
  }, [plants]);

  const loadAllRecords = async () => {
    try {
      setLoading(true);
      const records = await recordsAPI.getAll();
      setAllRecords(records);
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
    } finally {
      setLoading(false);
    }
  };

  const rankingData = useMemo(() => {
    // Somente plantas ativas
    const activePlants = plants.filter(p => p.status === 'ativa');
    
    // Calcular dados de ranking para cada planta
    const plantData: PlantRankingData[] = activePlants.map(plant => {
      const plantRecords = allRecords.filter(r => r.plant_id === plant.id);
      
      // Encontrar valores máximos
      const sizes = plantRecords.filter(r => r.plant_size != null).map(r => r.plant_size!);
      const leaves = plantRecords.filter(r => r.leaf_count != null).map(r => r.leaf_count!);
      const branches = plantRecords.filter(r => r.branch_count != null).map(r => r.branch_count!);
      
      const maxSize = sizes.length > 0 ? Math.max(...sizes) : 0;
      const maxLeaves = leaves.length > 0 ? Math.max(...leaves) : 0;
      const maxBranches = branches.length > 0 ? Math.max(...branches) : 0;
      
      // Encontrar último registro
      const latestRecord = plantRecords.length > 0 
        ? plantRecords.sort((a, b) => 
            new Date(b.record_date).getTime() - new Date(a.record_date).getTime()
          )[0]
        : null;
      
      return {
        plant,
        latestRecord,
        maxSize,
        maxLeaves,
        maxBranches,
        totalScore: 0, // Será calculado depois
      };
    });

    // Calcular valores máximos globais para normalização
    const globalMaxSize = Math.max(...plantData.map(p => p.maxSize), 1);
    const globalMaxLeaves = Math.max(...plantData.map(p => p.maxLeaves), 1);
    const globalMaxBranches = Math.max(...plantData.map(p => p.maxBranches), 1);

    // Calcular score normalizado (0-100 para cada métrica)
    plantData.forEach(p => {
      const sizeScore = (p.maxSize / globalMaxSize) * 100;
      const leavesScore = (p.maxLeaves / globalMaxLeaves) * 100;
      const branchesScore = (p.maxBranches / globalMaxBranches) * 100;
      
      // Score total é a média das métricas que têm dados
      const scores = [sizeScore, leavesScore, branchesScore].filter(s => s > 0);
      p.totalScore = scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 0;
    });

    // Ordenar por score total
    return plantData
      .filter(p => p.totalScore > 0) // Apenas plantas com algum dado
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [plants, allRecords]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <View style={styles.titleIcon}>
            <Text style={styles.titleIconText}>R</Text>
          </View>
          <Text style={styles.title}>Ranking de Evolução</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2d5016" />
          <Text style={styles.loadingText}>Calculando ranking...</Text>
        </View>
      </View>
    );
  }

  if (rankingData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <View style={styles.titleIcon}>
            <Text style={styles.titleIconText}>R</Text>
          </View>
          <Text style={styles.title}>Ranking de Evolução</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Sem dados de evolução ainda</Text>
          <Text style={styles.emptySubtext}>Adicione registros às suas plantas</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <View style={styles.titleIcon}>
          <Text style={styles.titleIconText}>R</Text>
        </View>
        <Text style={styles.title}>Ranking de Evolução</Text>
      </View>
      
      {/* Header da tabela */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.rankCell]}>#</Text>
        <Text style={[styles.headerCell, styles.nameCell]}>Planta</Text>
        <Text style={[styles.headerCell, styles.valueCell]}>Alt (cm)</Text>
        <Text style={[styles.headerCell, styles.valueCell]}>Folhas</Text>
        <Text style={[styles.headerCell, styles.valueCell]}>Ramos</Text>
      </View>

      {/* Linhas do ranking */}
      {rankingData.map((data, index) => (
        <TouchableOpacity
          key={data.plant.id}
          style={[
            styles.tableRow,
            index < 3 && styles.topThreeRow,
            index === 0 && styles.firstPlaceRow,
          ]}
          onPress={() => onPlantPress(data.plant.id!)}
          activeOpacity={0.7}
        >
          <View style={[styles.cell, styles.rankCell]}>
            {index < 3 ? (
              <View style={[styles.positionBadge, { backgroundColor: POSITION_COLORS[index] }]}>
                <Text style={styles.positionText}>{index + 1}</Text>
              </View>
            ) : (
              <Text style={styles.rankNumber}>{index + 1}º</Text>
            )}
          </View>
          
          <View style={[styles.cell, styles.nameCell]}>
            <Text style={styles.plantName} numberOfLines={1}>
              {data.plant.name}
            </Text>
            <Text style={styles.plantCode}>{data.plant.code}</Text>
          </View>
          
          <View style={[styles.cell, styles.valueCell]}>
            <Text style={[styles.value, styles.sizeValue]}>
              {data.maxSize > 0 ? `${data.maxSize}` : '-'}
            </Text>
            {data.maxSize > 0 && <Text style={styles.unit}>cm</Text>}
          </View>
          
          <View style={[styles.cell, styles.valueCell]}>
            <Text style={[styles.value, styles.leavesValue]}>
              {data.maxLeaves > 0 ? data.maxLeaves : '-'}
            </Text>
          </View>
          
          <View style={[styles.cell, styles.valueCell]}>
            <Text style={[styles.value, styles.branchesValue]}>
              {data.maxBranches > 0 ? data.maxBranches : '-'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      <Text style={styles.footerNote}>
        Toque em uma planta para ver detalhes
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  titleIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#2d5016',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleIconText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  topThreeRow: {
    backgroundColor: '#fffef0',
  },
  firstPlaceRow: {
    backgroundColor: '#fff9e6',
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankCell: {
    width: 36,
  },
  nameCell: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  valueCell: {
    width: 55,
  },
  positionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  plantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  plantCode: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  sizeValue: {
    color: '#4CAF50',
  },
  leavesValue: {
    color: '#2196F3',
  },
  branchesValue: {
    color: '#FF9800',
  },
  unit: {
    fontSize: 9,
    color: '#999',
  },
  footerNote: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
