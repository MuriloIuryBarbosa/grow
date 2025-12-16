import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens (serão criadas)
import HomeScreen from '../screens/HomeScreen';
import PlantDetailScreen from '../screens/PlantDetailScreen';
import NewPlantScreen from '../screens/NewPlantScreen';
import EditPlantScreen from '../screens/EditPlantScreen';
import NewRecordScreen from '../screens/NewRecordScreen';
import EditRecordScreen from '../screens/EditRecordScreen';
import SensorsScreen from '../screens/SensorsScreen';
import RecordReadingScreen from '../screens/RecordReadingScreen';
import NewSensorReadingScreen from '../screens/NewSensorReadingScreen';
// Genetic Bank Screens
import GeneticBankScreen from '../screens/GeneticBankScreen';
import GeneticDetailScreen from '../screens/GeneticDetailScreen';
import NewGeneticScreen from '../screens/NewGeneticScreen';
import SeedBatchDetailScreen from '../screens/SeedBatchDetailScreen';
import NewSeedBatchScreen from '../screens/NewSeedBatchScreen';
import NewCloneScreen from '../screens/NewCloneScreen';

export type RootStackParamList = {
  Home: undefined;
  PlantDetail: { id: number };
  NewPlant: { seedBatchId?: number; cloneId?: number };
  EditPlant: { id: number };
  NewRecord: { plantId: number };
  EditRecord: { plantId: number; recordId: number };
  Sensors: undefined;
  RecordReading: undefined;
  NewSensorReading: { sensor_id: number; sensor_name: string };
  // Genetic Bank Routes
  GeneticBank: undefined;
  GeneticDetail: { id: number };
  NewGenetic: { editId?: number };
  SeedBatchDetail: { id: number };
  NewSeedBatch: { geneticId?: number; editId?: number };
  NewClone: { motherId?: number; motherName?: string; editId?: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        id={undefined}
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2d5016',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: '🌱 Grow System' }}
        />
        <Stack.Screen
          name="PlantDetail"
          component={PlantDetailScreen}
          options={{ title: 'Detalhes da Planta' }}
        />
        <Stack.Screen
          name="NewPlant"
          component={NewPlantScreen}
          options={{ title: 'Nova Planta' }}
        />
        <Stack.Screen
          name="EditPlant"
          component={EditPlantScreen}
          options={{ title: 'Editar Planta' }}
        />
        <Stack.Screen
          name="NewRecord"
          component={NewRecordScreen}
          options={{ title: 'Novo Registro' }}
        />
        <Stack.Screen
          name="EditRecord"
          component={EditRecordScreen}
          options={{ title: 'Editar Registro' }}
        />
        <Stack.Screen
          name="Sensors"
          component={SensorsScreen}
          options={{ title: 'Sensores' }}
        />
        <Stack.Screen
          name="RecordReading"
          component={RecordReadingScreen}
          options={{ title: 'Registrar Leitura' }}
        />
        <Stack.Screen
          name="NewSensorReading"
          component={NewSensorReadingScreen}
          options={{ title: 'Nova Leitura de Sensor' }}
        />
        {/* Genetic Bank Screens */}
        <Stack.Screen
          name="GeneticBank"
          component={GeneticBankScreen}
          options={{ title: '🧬 Banco Genético' }}
        />
        <Stack.Screen
          name="GeneticDetail"
          component={GeneticDetailScreen}
          options={{ title: 'Detalhes da Genética' }}
        />
        <Stack.Screen
          name="NewGenetic"
          component={NewGeneticScreen}
          options={({ route }) => ({ 
            title: route.params?.editId ? 'Editar Genética' : 'Nova Genética' 
          })}
        />
        <Stack.Screen
          name="SeedBatchDetail"
          component={SeedBatchDetailScreen}
          options={{ title: 'Detalhes do Lote' }}
        />
        <Stack.Screen
          name="NewSeedBatch"
          component={NewSeedBatchScreen}
          options={({ route }) => ({ 
            title: route.params?.editId ? 'Editar Lote' : 'Novo Lote de Sementes' 
          })}
        />
        <Stack.Screen
          name="NewClone"
          component={NewCloneScreen}
          options={({ route }) => ({ 
            title: route.params?.editId ? 'Editar Clone' : 'Novo Clone' 
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
