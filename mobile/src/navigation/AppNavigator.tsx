import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';

// Screens
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
// Screens de lista
import ActivePlantsScreen from '../screens/ActivePlantsScreen';
import DeadPlantsScreen from '../screens/DeadPlantsScreen';
import GeneticMetricsScreen from '../screens/GeneticMetricsScreen';

export type RootStackParamList = {
  MainDrawer: undefined;
  PlantDetail: { id: number };
  NewPlant: { seedBatchId?: number; cloneId?: number };
  EditPlant: { id: number };
  NewRecord: { plantId: number };
  EditRecord: { plantId: number; recordId: number };
  RecordReading: undefined;
  NewSensorReading: { sensor_id: number; sensor_name: string };
  GeneticDetail: { id: number };
  NewGenetic: { editId?: number };
  SeedBatchDetail: { id: number };
  NewSeedBatch: { geneticId?: number; editId?: number };
  NewClone: { motherId?: number; motherName?: string; editId?: number };
};

export type DrawerParamList = {
  Home: undefined;
  ActivePlants: undefined;
  DeadPlants: undefined;
  GeneticBank: undefined;
  GeneticMetrics: undefined;
  Sensors: undefined;
  NewPlant: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

// Componente customizado do conteúdo do Drawer
function CustomDrawerContent(props: DrawerContentComponentProps) {
  return (
    <DrawerContentScrollView {...props} style={styles.drawerContainer}>
      {/* Header do Drawer */}
      <View style={styles.drawerHeader}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🌱</Text>
        </View>
        <Text style={styles.appTitle}>ShuriGrow</Text>
        <Text style={styles.appSubtitle}>Sistema de Cultivo</Text>
      </View>

      {/* Separador */}
      <View style={styles.separator} />

      {/* Items do Menu */}
      <DrawerItemList {...props} />

      {/* Footer */}
      <View style={styles.drawerFooter}>
        <Text style={styles.footerText}>v1.0.0</Text>
      </View>
    </DrawerContentScrollView>
  );
}

// Drawer Navigator
function DrawerNavigator() {
  return (
    <Drawer.Navigator
      id={undefined}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2d5016',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerStyle: {
          backgroundColor: '#fff',
          width: 280,
        },
        drawerActiveTintColor: '#2d5016',
        drawerInactiveTintColor: '#666',
        drawerActiveBackgroundColor: '#e8f5e9',
        drawerLabelStyle: {
          marginLeft: -16,
          fontSize: 15,
          fontWeight: '500',
        },
        drawerItemStyle: {
          borderRadius: 8,
          marginHorizontal: 8,
          marginVertical: 2,
        },
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Dashboard',
          drawerLabel: 'Dashboard',
          drawerIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text>,
        }}
      />
      <Drawer.Screen
        name="ActivePlants"
        component={ActivePlantsScreen}
        options={{
          title: 'Plantas Ativas',
          drawerLabel: 'Plantas Ativas',
          drawerIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🌿</Text>,
        }}
      />
      <Drawer.Screen
        name="DeadPlants"
        component={DeadPlantsScreen}
        options={{
          title: 'Plantas Mortas',
          drawerLabel: 'Plantas Mortas',
          drawerIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💀</Text>,
        }}
      />
      <Drawer.Screen
        name="GeneticBank"
        component={GeneticBankScreen}
        options={{
          title: 'Banco Genético',
          drawerLabel: 'Banco Genético',
          drawerIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🧬</Text>,
        }}
      />
      <Drawer.Screen
        name="GeneticMetrics"
        component={GeneticMetricsScreen}
        options={{
          title: 'Métricas Genéticas',
          drawerLabel: 'Métricas Genéticas',
          drawerIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📈</Text>,
        }}
      />
      <Drawer.Screen
        name="Sensors"
        component={SensorsScreen}
        options={{
          title: 'Sensores',
          drawerLabel: 'Sensores',
          drawerIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🌡️</Text>,
        }}
      />
      <Drawer.Screen
        name="NewPlant"
        component={NewPlantScreen}
        options={{
          title: 'Nova Planta',
          drawerLabel: 'Nova Planta',
          drawerIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>➕</Text>,
        }}
      />
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        id={undefined}
        initialRouteName="MainDrawer"
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
          name="MainDrawer"
          component={DrawerNavigator}
          options={{ headerShown: false }}
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
          name="RecordReading"
          component={RecordReadingScreen}
          options={{ title: 'Registrar Leitura' }}
        />
        <Stack.Screen
          name="NewSensorReading"
          component={NewSensorReadingScreen}
          options={{ title: 'Nova Leitura de Sensor' }}
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
            title: route.params?.editId ? 'Editar Genética' : 'Nova Genética',
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
            title: route.params?.editId ? 'Editar Lote' : 'Novo Lote de Sementes',
          })}
        />
        <Stack.Screen
          name="NewClone"
          component={NewCloneScreen}
          options={({ route }) => ({
            title: route.params?.editId ? 'Editar Clone' : 'Novo Clone',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
    backgroundColor: '#2d5016',
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#c8e6c9',
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
    marginHorizontal: 16,
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
