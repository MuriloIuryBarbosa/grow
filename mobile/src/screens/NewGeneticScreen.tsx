import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { GeneticStrain } from '../types';
import { geneticsAPI } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'NewGenetic'>;
  route: RouteProp<RootStackParamList, 'NewGenetic'>;
};

type GeneticType = 'indica' | 'sativa' | 'hybrid' | 'ruderalis' | 'unknown';

const GENETIC_TYPES: { value: GeneticType; label: string; color: string }[] = [
  { value: 'indica', label: 'Indica', color: '#7B68EE' },
  { value: 'sativa', label: 'Sativa', color: '#FFD700' },
  { value: 'hybrid', label: 'Híbrida', color: '#32CD32' },
  { value: 'ruderalis', label: 'Ruderalis', color: '#A9A9A9' },
  { value: 'unknown', label: 'Desconhecida', color: '#808080' },
];

export default function NewGeneticScreen({ navigation, route }: Props) {
  const editId = route.params?.editId;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!editId);

  const [name, setName] = useState('');
  const [breeder, setBreeder] = useState('');
  const [type, setType] = useState<GeneticType>('hybrid');
  const [thcContent, setThcContent] = useState('');
  const [cbdContent, setCbdContent] = useState('');
  const [floweringTimeMin, setFloweringTimeMin] = useState('');
  const [floweringTimeMax, setFloweringTimeMax] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editId) {
      loadGenetic();
    }
  }, [editId]);

  const loadGenetic = async () => {
    try {
      const genetic = await geneticsAPI.getById(editId!);
      setName(genetic.name);
      setBreeder(genetic.breeder || '');
      setType((genetic.type as GeneticType) || 'hybrid');
      setThcContent(genetic.thc_content?.toString() || '');
      setCbdContent(genetic.cbd_content?.toString() || '');
      setFloweringTimeMin(genetic.flowering_time_min?.toString() || '');
      setFloweringTimeMax(genetic.flowering_time_max?.toString() || '');
      setDescription(genetic.description || '');
    } catch (error) {
      console.error('Erro ao carregar genética:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da genética');
      navigation.goBack();
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome da genética é obrigatório');
      return false;
    }

    if (thcContent && (isNaN(parseFloat(thcContent)) || parseFloat(thcContent) < 0 || parseFloat(thcContent) > 100)) {
      Alert.alert('Erro', 'O teor de THC deve ser um número entre 0 e 100');
      return false;
    }

    if (cbdContent && (isNaN(parseFloat(cbdContent)) || parseFloat(cbdContent) < 0 || parseFloat(cbdContent) > 100)) {
      Alert.alert('Erro', 'O teor de CBD deve ser um número entre 0 e 100');
      return false;
    }

    if (floweringTimeMin && floweringTimeMax) {
      const min = parseInt(floweringTimeMin);
      const max = parseInt(floweringTimeMax);
      if (min > max) {
        Alert.alert('Erro', 'O tempo mínimo de floração não pode ser maior que o máximo');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const geneticData: Partial<GeneticStrain> = {
        name: name.trim(),
        breeder: breeder.trim() || undefined,
        type,
        thc_content: thcContent ? parseFloat(thcContent) : undefined,
        cbd_content: cbdContent ? parseFloat(cbdContent) : undefined,
        flowering_time_min: floweringTimeMin ? parseInt(floweringTimeMin) : undefined,
        flowering_time_max: floweringTimeMax ? parseInt(floweringTimeMax) : undefined,
        description: description.trim() || undefined,
      };

      if (editId) {
        await geneticsAPI.update(editId, geneticData);
        Alert.alert('Sucesso', 'Genética atualizada com sucesso!');
      } else {
        await geneticsAPI.create(geneticData);
        Alert.alert('Sucesso', 'Genética cadastrada com sucesso!');
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Erro ao salvar genética:', error);
      Alert.alert('Erro', error.message || 'Não foi possível salvar a genética');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2d5016" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        {/* Nome */}
        <View style={styles.field}>
          <Text style={styles.label}>Nome da Genética *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex: White Widow, OG Kush, etc."
            placeholderTextColor="#999"
          />
        </View>

        {/* Breeder */}
        <View style={styles.field}>
          <Text style={styles.label}>Breeder / Banco de Sementes</Text>
          <TextInput
            style={styles.input}
            value={breeder}
            onChangeText={setBreeder}
            placeholder="Ex: Royal Queen Seeds, Barney's Farm..."
            placeholderTextColor="#999"
          />
        </View>

        {/* Tipo */}
        <View style={styles.field}>
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.typeContainer}>
            {GENETIC_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.typeButton,
                  type === t.value && { backgroundColor: t.color },
                ]}
                onPress={() => setType(t.value)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === t.value && styles.typeButtonTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* THC / CBD */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>THC (%)</Text>
            <TextInput
              style={styles.input}
              value={thcContent}
              onChangeText={setThcContent}
              placeholder="0-100"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ width: 16 }} />
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>CBD (%)</Text>
            <TextInput
              style={styles.input}
              value={cbdContent}
              onChangeText={setCbdContent}
              placeholder="0-100"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Tempo de Floração */}
        <Text style={styles.sectionTitle}>⏱️ Tempo de Floração (dias)</Text>
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Mínimo</Text>
            <TextInput
              style={styles.input}
              value={floweringTimeMin}
              onChangeText={setFloweringTimeMin}
              placeholder="Ex: 56"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
          </View>
          <View style={{ width: 16 }} />
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Máximo</Text>
            <TextInput
              style={styles.input}
              value={floweringTimeMax}
              onChangeText={setFloweringTimeMax}
              placeholder="Ex: 63"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Descrição */}
        <View style={styles.field}>
          <Text style={styles.label}>Descrição / Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Características, efeitos, notas de cultivo..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Botão Salvar */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {editId ? '✏️ Atualizar Genética' : '🧬 Cadastrar Genética'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2d5016',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
