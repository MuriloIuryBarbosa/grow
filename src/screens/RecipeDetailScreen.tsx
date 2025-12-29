import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { recipesAPI } from '../services/api';
import { Recipe } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

interface RecipeMetrics {
  totalH2O: number;
  totalH2O2: number;
  successRate: number;
  relatedSeeds: Array<{
    id: number;
    name: string;
    genetic_name: string;
    created_at: string;
  }>;
}

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [metrics, setMetrics] = useState<RecipeMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipeDetail();
  }, [id]);

  const loadRecipeDetail = async () => {
    try {
      setLoading(true);
      const recipeData = await recipesAPI.getById(id);
      setRecipe(recipeData);

      const metricsData = await recipesAPI.getMetrics(id);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Erro ao carregar detalhes da receita:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!recipe || !metrics) {
    return (
      <View style={styles.center}>
        <Text>Receita não encontrada</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{recipe.name}</Text>
        <Text style={styles.processType}>
          {recipe.process_type === 'germination' ? '🌱 Germinação' :
           recipe.process_type === 'vegetation' ? '🌿 Vegetação' : '🌸 Floração'}
        </Text>
        {recipe.description && (
          <Text style={styles.description}>{recipe.description}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredientes</Text>
        {recipe.ingredients.map((ingredient, index) => (
          <View key={index} style={styles.ingredientItem}>
            <Text style={styles.ingredientName}>{ingredient.name}</Text>
            <Text style={styles.ingredientAmount}>
              {ingredient.amount} {ingredient.unit}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Métricas</Text>
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total H2O</Text>
            <Text style={styles.metricValue}>{metrics.totalH2O} ml</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total H2O2</Text>
            <Text style={styles.metricValue}>{metrics.totalH2O2} ml</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Taxa de Sucesso</Text>
            <Text style={styles.metricValue}>{metrics.successRate}%</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sementes Relacionadas</Text>
        {metrics.relatedSeeds.length > 0 ? (
          <FlatList
            data={metrics.relatedSeeds}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.seedItem}>
                <Text style={styles.seedName}>{item.name}</Text>
                <Text style={styles.seedGenetic}>{item.genetic_name}</Text>
                <Text style={styles.seedDate}>{item.created_at}</Text>
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.noData}>Nenhuma semente relacionada encontrada</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  processType: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  ingredientName: {
    fontSize: 16,
    color: '#333',
  },
  ingredientAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  seedItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  seedName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  seedGenetic: {
    fontSize: 14,
    color: '#666',
  },
  seedDate: {
    fontSize: 12,
    color: '#999',
  },
  noData: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 16,
  },
});