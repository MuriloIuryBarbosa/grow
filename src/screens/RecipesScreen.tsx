import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { recipesAPI } from '../services/api';
import { Recipe } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Recipes'>;

const PROCESS_TYPES = [
  { value: 'germination', label: '🌱 Germinação' },
  { value: 'vegetation', label: '🌿 Vegetação' },
  { value: 'flowering', label: '🌸 Floração' },
];

const UNITS = ['ml', 'l', 'g', 'kg', 'drops', 'tsp', 'tbsp'];

export default function RecipesScreen({ navigation }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    process_type: 'germination' as Recipe['process_type'],
    description: '',
    ingredients: [] as Array<{ name: string; amount: string; unit: string }>,
  });

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const data = await recipesAPI.getAll();
      setRecipes(data);
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as receitas');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      process_type: 'germination',
      description: '',
      ingredients: [],
    });
    setEditingRecipe(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (recipe: Recipe) => {
    setFormData({
      name: recipe.name,
      process_type: recipe.process_type,
      description: recipe.description || '',
      ingredients: recipe.ingredients.map(ing => ({ ...ing, amount: ing.amount.toString() })),
    });
    setEditingRecipe(recipe);
    setShowCreateModal(true);
  };

  const handleDelete = (recipe: Recipe) => {
    Alert.alert(
      'Confirmar exclusão',
      `Deseja excluir a receita "${recipe.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await recipesAPI.delete(recipe.id!);
              setRecipes(recipes.filter(r => r.id !== recipe.id));
              Alert.alert('Sucesso', 'Receita excluída com sucesso');
            } catch (error) {
              console.error('Erro ao excluir receita:', error);
              Alert.alert('Erro', 'Não foi possível excluir a receita');
            }
          },
        },
      ]
    );
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert('Erro', 'Nome da receita é obrigatório');
      return false;
    }
    if (formData.ingredients.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um ingrediente');
      return false;
    }
    for (const ingredient of formData.ingredients) {
      if (!ingredient.name.trim() || parseFloat(ingredient.amount) <= 0 || isNaN(parseFloat(ingredient.amount)) || !ingredient.unit) {
        Alert.alert('Erro', 'Todos os campos dos ingredientes são obrigatórios e quantidade deve ser um número positivo');
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const recipeData = {
        name: formData.name.trim(),
        process_type: formData.process_type,
        description: formData.description.trim() || undefined,
        ingredients: formData.ingredients.map(ing => ({ ...ing, amount: parseFloat(ing.amount) })),
      };

      if (editingRecipe) {
        const updated = await recipesAPI.update(editingRecipe.id!, recipeData);
        setRecipes(recipes.map(r => r.id === editingRecipe.id ? updated : r));
        Alert.alert('Sucesso', 'Receita atualizada com sucesso');
      } else {
        const created = await recipesAPI.create(recipeData);
        setRecipes([...recipes, created]);
        Alert.alert('Sucesso', 'Receita criada com sucesso');
      }

      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar receita:', error);
      Alert.alert('Erro', 'Não foi possível salvar a receita');
    }
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: '0', unit: 'ml' }],
    }));
  };

  const updateIngredient = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      ),
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => navigation.navigate('RecipeDetail', { id: item.id! })}
    >
      <View style={styles.recipeHeader}>
        <Text style={styles.recipeName}>{item.name}</Text>
        <Text style={styles.processType}>
          {PROCESS_TYPES.find(pt => pt.value === item.process_type)?.label}
        </Text>
      </View>

      {item.description && (
        <Text style={styles.description}>{item.description}</Text>
      )}

      <Text style={styles.ingredientsTitle}>Ingredientes:</Text>
      {item.ingredients.map((ing, index) => (
        <Text key={index} style={styles.ingredient}>
          • {ing.amount} {ing.unit} de {ing.name}
        </Text>
      ))}

      <View style={styles.recipeActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item)}
        >
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteButtonText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Carregando receitas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍳 Receitas</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
          <Text style={styles.addButtonText}>+ Nova Receita</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={recipes}
        renderItem={renderRecipe}
        keyExtractor={(item) => item.id!.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhuma receita cadastrada</Text>
            <Text style={styles.emptySubtext}>Crie sua primeira receita para começar</Text>
          </View>
        }
      />

      {/* Modal para criar/editar receita */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingRecipe ? 'Editar Receita' : 'Nova Receita'}
            </Text>

            <Text style={styles.label}>Nome da Receita *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Germinação Básica"
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            />

            <Text style={styles.label}>Tipo de Processo *</Text>
            <View style={styles.processTypeContainer}>
              {PROCESS_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.processTypeButton,
                    formData.process_type === type.value && styles.processTypeButtonActive,
                  ]}
                  onPress={() => {
                    const newProcessType = type.value;
                    setFormData(prev => ({
                      ...prev,
                      process_type: newProcessType,
                      ingredients: newProcessType === 'germination' ? [
                        { name: 'H2O', amount: 0, unit: 'ml' },
                        { name: 'H2O2', amount: 0, unit: 'ml' },
                      ] : prev.ingredients,
                    }));
                  }}
                >
                  <Text
                    style={[
                      styles.processTypeButtonText,
                      formData.process_type === type.value && styles.processTypeButtonTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descrição opcional da receita"
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Ingredientes *</Text>
            {formData.process_type === 'germination' ? (
              <View>
                {/* H2O */}
                <View style={styles.ingredientRow}>
                  <Text style={[styles.input, styles.ingredientInput, styles.fixedIngredient]}>H2O</Text>
                  <TextInput
                    style={[styles.input, styles.amountInput]}
                    placeholder="0"
                    value={formData.ingredients.find(i => i.name === 'H2O')?.amount.toString() || '0'}
                    onChangeText={(text) => {
                      const amount = parseFloat(text) || 0;
                      setFormData(prev => ({
                        ...prev,
                        ingredients: prev.ingredients.map(i =>
                          i.name === 'H2O' ? { ...i, amount } : i
                        ),
                      }));
                    }}
                    keyboardType="numeric"
                  />
                  <View style={styles.unitContainer}>
                    {UNITS.map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[
                          styles.unitButton,
                          (formData.ingredients.find(i => i.name === 'H2O')?.unit || 'ml') === unit && styles.unitButtonActive,
                        ]}
                        onPress={() => {
                          setFormData(prev => ({
                            ...prev,
                            ingredients: prev.ingredients.map(i =>
                              i.name === 'H2O' ? { ...i, unit } : i
                            ),
                          }));
                        }}
                      >
                        <Text
                          style={[
                            styles.unitButtonText,
                            (formData.ingredients.find(i => i.name === 'H2O')?.unit || 'ml') === unit && styles.unitButtonTextActive,
                          ]}
                        >
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                {/* H2O2 */}
                <View style={styles.ingredientRow}>
                  <Text style={[styles.input, styles.ingredientInput, styles.fixedIngredient]}>H2O2</Text>
                  <TextInput
                    style={[styles.input, styles.amountInput]}
                    placeholder="0"
                    value={formData.ingredients.find(i => i.name === 'H2O2')?.amount.toString() || '0'}
                    onChangeText={(text) => {
                      const amount = parseFloat(text) || 0;
                      setFormData(prev => ({
                        ...prev,
                        ingredients: prev.ingredients.map(i =>
                          i.name === 'H2O2' ? { ...i, amount } : i
                        ),
                      }));
                    }}
                    keyboardType="numeric"
                  />
                  <View style={styles.unitContainer}>
                    {UNITS.map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[
                          styles.unitButton,
                          (formData.ingredients.find(i => i.name === 'H2O2')?.unit || 'ml') === unit && styles.unitButtonActive,
                        ]}
                        onPress={() => {
                          setFormData(prev => ({
                            ...prev,
                            ingredients: prev.ingredients.map(i =>
                              i.name === 'H2O2' ? { ...i, unit } : i
                            ),
                          }));
                        }}
                      >
                        <Text
                          style={[
                            styles.unitButtonText,
                            (formData.ingredients.find(i => i.name === 'H2O2')?.unit || 'ml') === unit && styles.unitButtonTextActive,
                          ]}
                        >
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            ) : (
              <>
                {formData.ingredients.map((ingredient, index) => (
                  <View key={index} style={styles.ingredientRow}>
                    <TextInput
                      style={[styles.input, styles.ingredientInput]}
                      placeholder="Nome do ingrediente"
                      value={ingredient.name}
                      onChangeText={(text) => updateIngredient(index, 'name', text)}
                    />
                    <TextInput
                      style={[styles.input, styles.amountInput]}
                      placeholder="0"
                      value={ingredient.amount}
                      onChangeText={(text) => updateIngredient(index, 'amount', text)}
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                    />
                    <View style={styles.unitContainer}>
                      {UNITS.map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[
                            styles.unitButton,
                            ingredient.unit === unit && styles.unitButtonActive,
                          ]}
                          onPress={() => updateIngredient(index, 'unit', unit)}
                        >
                          <Text
                            style={[
                              styles.unitButtonText,
                              ingredient.unit === unit && styles.unitButtonTextActive,
                            ]}
                          >
                            {unit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={styles.removeIngredientButton}
                      onPress={() => removeIngredient(index)}
                    >
                      <Text style={styles.removeIngredientText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.addIngredientButton} onPress={addIngredient}>
                  <Text style={styles.addIngredientText}>+ Adicionar Ingrediente</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  addButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  list: {
    padding: 20,
  },
  recipeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  processType: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  ingredientsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ingredient: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
    marginBottom: 4,
  },
  recipeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  processTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  processTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  processTypeButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  processTypeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  processTypeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientInput: {
    flex: 2,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    marginRight: 8,
  },
  unitContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  unitButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 2,
  },
  unitButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  unitButtonText: {
    fontSize: 12,
    color: '#666',
  },
  unitButtonTextActive: {
    color: '#fff',
  },
  removeIngredientButton: {
    padding: 8,
  },
  removeIngredientText: {
    fontSize: 18,
    color: '#f44336',
    fontWeight: 'bold',
  },
  addIngredientButton: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  addIngredientText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  fixedIngredient: {
    backgroundColor: '#f0f0f0',
    color: '#666',
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2E7D32',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});