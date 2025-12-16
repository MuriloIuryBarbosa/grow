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
const VALUE_COLORS = {
  size: '#4CAF50',
  leaves: '#2196F3',
  branches: '#FF9800',
};

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
        <Text style={styles.sectionTitle}>Ranking de Evolução</Text>
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
        <Text style={styles.sectionTitle}>Ranking de Evolução</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Sem dados de evolução ainda</Text>
          <Text style={styles.emptySubtext}>Adicione registros às suas plantas</Text>
        </View>
      </View>
    );
  }

  const renderRankingRow = (data: PlantRankingData, index: number) => {
    const isTopThree = index < 3;
    return (
      <TouchableOpacity
        key={data.plant.id}
        style={styles.rankingRow}
        onPress={() => onPlantPress(data.plant.id!)}
        activeOpacity={0.7}
      >
        {/* Posição */}
        <View style={[styles.rankingCol1, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
          {isTopThree ? (
            <View style={[styles.positionBadge, { backgroundColor: POSITION_COLORS[index] }]}>
              <Text style={styles.positionText}>{index + 1}</Text>
            </View>
          ) : (
            <View style={[styles.rankingDot, { backgroundColor: '#999' }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.rankingLabel} numberOfLines={1}>{data.plant.name}</Text>
            <Text style={styles.plantCode}>{data.plant.code}</Text>
          </View>
        </View>
        
        {/* Altura */}
        <View style={styles.rankingCol2}>
          <Text style={[styles.rankingValue, { color: VALUE_COLORS.size }]}>
            {data.maxSize > 0 ? data.maxSize : '-'}
          </Text>
        </View>
        
        {/* Folhas */}
        <View style={styles.rankingCol3}>
          <Text style={[styles.rankingValue, { color: VALUE_COLORS.leaves }]}>
            {data.maxLeaves > 0 ? data.maxLeaves : '-'}
          </Text>
        </View>
        
        {/* Ramos */}
        <View style={styles.rankingCol4}>
          <Text style={[styles.rankingValue, { color: VALUE_COLORS.branches }]}>
            {data.maxBranches > 0 ? data.maxBranches : '-'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Ranking de Evolução</Text>
      
      {/* Header da tabela - mesmo estilo da evolução de fases */}
      <View style={styles.rankingHeader}>
        <Text style={[styles.rankingHeaderText, styles.rankingCol1]}>Planta</Text>
        <Text style={[styles.rankingHeaderText, styles.rankingCol2]}>Alt</Text>
        <Text style={[styles.rankingHeaderText, styles.rankingCol3]}>Folhas</Text>
        <Text style={[styles.rankingHeaderText, styles.rankingCol4]}>Ramos</Text>
      </View>

      {/* Linhas do ranking */}
      {rankingData.map((data, index) => renderRankingRow(data, index))}

      <Text style={styles.footerNote}>
        Toque em uma planta para ver detalhes
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginLeft: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  // Header - mesmo estilo da tabela de evolução de fases
  rankingHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 4,
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 12,
  },
  rankingHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  // Row - mesmo estilo da tabela de evolução de fases
  rankingRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  // Colunas - mesmo estilo da tabela de evolução de fases
  rankingCol1: { flex: 2 },
  rankingCol2: { flex: 1, alignItems: 'center' },
  rankingCol3: { flex: 1, alignItems: 'center' },
  rankingCol4: { flex: 1, alignItems: 'center' },
  // Dot - mesmo estilo da tabela de evolução de fases
  rankingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rankingLabel: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  rankingValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Badge de posição (top 3)
  positionBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  plantCode: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  footerNote: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
