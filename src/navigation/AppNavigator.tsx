import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
import BatchGerminationScreen from '../screens/BatchGerminationScreen';
import PlantAnalysisScreen from '../screens/PlantAnalysisScreen';
import RecipesScreen from '../screens/RecipesScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

export type RootStackParamList = {
  Home: undefined;
  PlantDetail: { id: number };
  NewPlant: { seedBatchId?: number; cloneId?: number };
  EditPlant: { id: number };
  NewRecord: { plantId: number; prefilledSize?: number };
  EditRecord: { plantId: number; recordId: number };
  RecordReading: undefined;
  NewSensorReading: { sensor_id: number; sensor_name: string };
  GeneticBank: undefined;
  GeneticDetail: { id: number };
  NewGenetic: { editId?: number };
  SeedBatchDetail: { id: number };
  NewSeedBatch: { geneticId?: number; editId?: number };
  NewClone: { motherId?: number; motherName?: string; editId?: number };
  ActivePlants: undefined;
  DeadPlants: undefined;
  BatchGermination: undefined;
  Sensors: undefined;
  PlantAnalysis: undefined;
  Recipes: undefined;
  RecipeDetail: { id: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Drawer Context
interface DrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextType>({
  isOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {},
});

export const useDrawer = () => useContext(DrawerContext);

// Menu Item Component
interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  isActive?: boolean;
}

function MenuItem({ icon, label, onPress, isActive }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, isActive && styles.menuItemActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Custom Drawer Component
function CustomDrawer({ navigation, closeDrawer }: { navigation: any; closeDrawer: () => void }) {
  const navigateTo = (screen: string) => {
    closeDrawer();
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={styles.drawerContainer}>
      {/* Header */}
      <View style={styles.drawerHeader}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🌱</Text>
        </View>
        <Text style={styles.appTitle}>ShuriGrow</Text>
        <Text style={styles.appSubtitle}>Sistema de Cultivo</Text>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.menuContainer}>
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Principal</Text>
          <MenuItem
            icon="📊"
            label="Dashboard"
            onPress={() => navigateTo('Home')}
          />
          <MenuItem
            icon="🌿"
            label="Plantas Ativas"
            onPress={() => navigateTo('ActivePlants')}
          />
          <MenuItem
            icon="💀"
            label="Plantas Mortas"
            onPress={() => navigateTo('DeadPlants')}
          />
        </View>

        <View style={styles.menuDivider} />

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Genética</Text>
          <MenuItem
            icon="🧬"
            label="Banco Genético"
            onPress={() => navigateTo('GeneticBank')}
          />
          <MenuItem
            icon="�"
            label="Receitas"
            onPress={() => navigateTo('Recipes')}
          />
          <MenuItem
            icon="�🌱"
            label="Germinação em Lote"
            onPress={() => navigateTo('BatchGermination')}
          />
        </View>

        <View style={styles.menuDivider} />

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Monitoramento</Text>
          <MenuItem
            icon="🌡️"
            label="Sensores"
            onPress={() => navigateTo('Sensors')}
          />
        </View>

        <View style={styles.menuDivider} />

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Ações</Text>
          <MenuItem
            icon="➕"
            label="Nova Planta"
            onPress={() => navigateTo('NewPlant')}
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.drawerFooter}>
        <Text style={styles.footerText}>v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

// Drawer Provider Component
function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-DRAWER_WIDTH));

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsOpen(false);
    });
  }, [slideAnim]);

  const toggleDrawer = useCallback(() => {
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }, [isOpen, openDrawer, closeDrawer]);

  return (
    <DrawerContext.Provider value={{ isOpen, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
      {isOpen && (
        <Modal
          visible={isOpen}
          transparent
          animationType="none"
          onRequestClose={closeDrawer}
        >
          <View style={styles.modalContainer}>
            <Pressable style={styles.overlay} onPress={closeDrawer} />
            <Animated.View
              style={[
                styles.drawer,
                { transform: [{ translateX: slideAnim }] },
              ]}
            >
              <DrawerWrapper closeDrawer={closeDrawer} />
            </Animated.View>
          </View>
        </Modal>
      )}
    </DrawerContext.Provider>
  );
}

// Wrapper to access navigation inside modal
function DrawerWrapper({ closeDrawer }: { closeDrawer: () => void }) {
  const navigation = useNavigation();
  return <CustomDrawer navigation={navigation} closeDrawer={closeDrawer} />;
}

// Hamburger Menu Button Component
export function HamburgerButton() {
  const { toggleDrawer } = useDrawer();

  return (
    <TouchableOpacity onPress={toggleDrawer} style={styles.hamburgerButton}>
      <View style={styles.hamburgerLine} />
      <View style={styles.hamburgerLine} />
      <View style={styles.hamburgerLine} />
    </TouchableOpacity>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <DrawerProvider>
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
            headerLeft: () => <HamburgerButton />,
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Dashboard' }}
          />
          <Stack.Screen
            name="PlantDetail"
            component={PlantDetailScreen}
            options={{ 
              title: 'Detalhes da Planta',
              headerLeft: undefined,
            }}
          />
          <Stack.Screen
            name="NewPlant"
            component={NewPlantScreen}
            options={{ 
              title: 'Nova Planta',
              headerLeft: undefined,
            }}
          />
          <Stack.Screen
            name="EditPlant"
            component={EditPlantScreen}
            options={{ 
              title: 'Editar Planta',
              headerLeft: undefined,
            }}
          />
          <Stack.Screen
            name="NewRecord"
            component={NewRecordScreen}
            options={{ 
              title: 'Novo Registro',
              headerLeft: undefined,
            }}
          />
          <Stack.Screen
            name="EditRecord"
            component={EditRecordScreen}
            options={{ 
              title: 'Editar Registro',
              headerLeft: undefined,
            }}
          />
          <Stack.Screen
            name="RecordReading"
            component={RecordReadingScreen}
            options={{ 
              title: 'Leitura de Sensor',
              headerLeft: undefined,
            }}
          />
          <Stack.Screen
            name="NewSensorReading"
            component={NewSensorReadingScreen}
            options={{ 
              title: 'Nova Leitura',
              headerLeft: undefined,
            }}
          />
          <Stack.Screen
            name="GeneticBank"
            component={GeneticBankScreen}
            options={{ title: 'Banco Genético' }}
          />
          <Stack.Screen
            name="GeneticDetail"
            component={GeneticDetailScreen}
            options={{ 
              title: 'Detalhes da Genética',
              headerLeft: undefined,
            }}
          />
          <Stack.Screen
            name="NewGenetic"
            component={NewGeneticScreen}
            options={{ 
              title: 'Nova Genética',
              headerLeft: undefined,
            }}
          />
          <Stack.Screen
            name="SeedBatchDetail"
            component={SeedBatchDetailScreen}
            options={{ 
              title: 'Detalhes do Lote',
              headerLeft: undefined,
            }}
          />
          <Stack.Screen
            name="NewSeedBatch"
            component={NewSeedBatchScreen}
            options={{ 
              title: 'Novo Lote de Sementes',
              headerLeft: undefined,
            }}
          />
          <Stack.Screen
            name="NewClone"
            component={NewCloneScreen}
            options={{ 
              title: 'Novo Clone',
              headerLeft: undefined,
            }}
          />
          <Stack.Screen
            name="ActivePlants"
            component={ActivePlantsScreen}
            options={{ title: 'Plantas Ativas' }}
          />
          <Stack.Screen
            name="DeadPlants"
            component={DeadPlantsScreen}
            options={{ title: 'Plantas Mortas' }}
          />
          <Stack.Screen
            name="GeneticMetrics"
            component={GeneticMetricsScreen}
            options={{ title: 'Métricas Genéticas' }}
          />
          <Stack.Screen
            name="BatchGermination"
            component={BatchGerminationScreen}
            options={{ title: 'Germinação em Lote' }}
          />
          <Stack.Screen
            name="Sensors"
            component={SensorsScreen}
            options={{ title: 'Sensores' }}
          />
          <Stack.Screen
            name="PlantAnalysis"
            component={PlantAnalysisScreen}
            options={{ title: 'Análise de Planta' }}
          />
          <Stack.Screen
            name="Recipes"
            component={RecipesScreen}
            options={{ title: 'Receitas' }}
          />
          <Stack.Screen
            name="RecipeDetail"
            component={RecipeDetailScreen}
            options={{ title: 'Detalhes da Receita' }}
          />
        </Stack.Navigator>
      </DrawerProvider>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  drawerHeader: {
    backgroundColor: '#2d5016',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontSize: 36,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 10,
  },
  menuSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  menuItemActive: {
    backgroundColor: '#e8f5e9',
  },
  menuIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  menuLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuLabelActive: {
    color: '#2d5016',
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#888',
  },
  hamburgerButton: {
    marginLeft: 16,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerLine: {
    width: 22,
    height: 3,
    backgroundColor: '#fff',
    marginVertical: 2,
    borderRadius: 2,
  },
});
