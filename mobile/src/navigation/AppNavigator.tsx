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

export type RootStackParamList = {
  Home: undefined;
  PlantDetail: { id: number };
  NewPlant: undefined;
  EditPlant: { id: number };
  NewRecord: { plantId: number };
  EditRecord: { plantId: number; recordId: number };
  Sensors: undefined;
  RecordReading: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
