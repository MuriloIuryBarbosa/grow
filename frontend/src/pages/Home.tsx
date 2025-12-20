import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlants } from '../hooks/usePlants';
import { useGenetics } from '../hooks/useGenetics';
import PlantCard from '../components/PlantCard';
import SensorDashboard from '../components/SensorDashboard';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Filters from '../components/Filters';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function Home() {
  const navigate = useNavigate();
  const { plants, loading, error, refetch } = usePlants();
  const { genetics } = useGenetics();
  const [showDead, setShowDead] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plants'>('dashboard');

  // Estados para filtros e paginação
  const [selectedPhase, setSelectedPhase] = useState('');
  const [selectedGenetic, setSelectedGenetic] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // 12 plantas por página (4 linhas x 3 colunas)

  const activePlants = useMemo(() => plants.filter(p => p.status === 'ativa'), [plants]);
  const deadPlants = useMemo(() => plants.filter(p => p.status === 'morta'), [plants]);

  // Filtrar plantas baseado nos filtros selecionados
  const filteredPlants = useMemo(() => {
    const plantsToFilter = showDead ? deadPlants : activePlants;

    return plantsToFilter.filter(plant => {
      const phaseMatch = !selectedPhase || plant.current_phase === selectedPhase;
      const geneticMatch = !selectedGenetic || plant.genetic === selectedGenetic;

      return phaseMatch && geneticMatch;
    });
  }, [activePlants, deadPlants, showDead, selectedPhase, selectedGenetic]);

  // Calcular paginação
  const totalPages = Math.ceil(filteredPlants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPlants = filteredPlants.slice(startIndex, endIndex);
  
  const stats = useMemo(() => ({
    germinacao: activePlants.filter(p => p.current_phase === 'germinacao').length,
    muda: activePlants.filter(p => p.current_phase === 'muda').length,
    vegetacao: activePlants.filter(p => p.current_phase === 'vegetacao').length,
    floracao: activePlants.filter(p => p.current_phase === 'floracao').length,
  }), [activePlants]);

  const handlePlantClick = useCallback((id: number) => {
    navigate(`/plant/${id}`);
  }, [navigate]);

  const handlePhaseChange = useCallback((phase: string) => {
    setSelectedPhase(phase);
    setCurrentPage(1); // Reset para primeira página quando filtro muda
  }, []);

  const handleGeneticChange = useCallback((genetic: string) => {
    setSelectedGenetic(genetic);
    setCurrentPage(1); // Reset para primeira página quando filtro muda
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedPhase('');
    setSelectedGenetic('');
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // Scroll suave para o topo da lista de plantas
    const plantsSection = document.querySelector('.plants-section');
    if (plantsSection) {
      plantsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleTabChange = useCallback((tab: 'dashboard' | 'plants') => {
    setActiveTab(tab);
    if (tab === 'plants') {
      setCurrentPage(1); // Reset paginação ao mudar para aba de plantas
    }
  }, []);

  if (loading) return <Loading message="Carregando plantas..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="container">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🌱 Grow System</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/sensors')}>
            ⚙️ Sensores
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/record-reading')}>
            📊 Registrar Leitura
          </Button>
          <Button onClick={() => navigate('/new')}>
            ➕ Nova Planta
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b-2 border-gray-200">
        <Button
          variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
          size="lg"
          onClick={() => handleTabChange('dashboard')}
          className={`rounded-none border-b-2 ${
            activeTab === 'dashboard'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent'
          }`}
        >
          📊 Dashboard
        </Button>
        <Button
          variant={activeTab === 'plants' ? 'default' : 'ghost'}
          size="lg"
          onClick={() => handleTabChange('plants')}
          className={`rounded-none border-b-2 ml-4 ${
            activeTab === 'plants'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent'
          }`}
        >
          🌱 Minhas Plantas ({showDead ? deadPlants.length : activePlants.length})
        </Button>
      </div>

      {activeTab === 'dashboard' ? (
        <SensorDashboard />
      ) : (
        <>
          <div className="stats">
            <Card>
              <CardContent className="text-center p-4">
                <div className="text-sm text-gray-600 uppercase tracking-wide">Total de Plantas</div>
                <div className="text-3xl font-bold text-primary-600 mt-1">{plants.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center p-4">
                <div className="text-sm text-gray-600 uppercase tracking-wide">Plantas Ativas</div>
                <div className="text-3xl font-bold text-primary-600 mt-1">{activePlants.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center p-4">
                <div className="text-sm text-gray-600 uppercase tracking-wide">Germinação</div>
                <div className="text-3xl font-bold text-primary-600 mt-1">{stats.germinacao}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center p-4">
                <div className="text-sm text-gray-600 uppercase tracking-wide">Muda</div>
                <div className="text-3xl font-bold text-primary-600 mt-1">{stats.muda}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center p-4">
                <div className="text-sm text-gray-600 uppercase tracking-wide">Vegetativa</div>
                <div className="text-3xl font-bold text-primary-600 mt-1">{stats.vegetacao}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center p-4">
                <div className="text-sm text-gray-600 uppercase tracking-wide">Floração</div>
                <div className="text-3xl font-bold text-primary-600 mt-1">{stats.floracao}</div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-4">
            <Button
              variant={!showDead ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowDead(false);
                setCurrentPage(1);
              }}
              className="mr-2"
            >
              🌱 Ativas ({activePlants.length})
            </Button>
            <Button
              variant={showDead ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowDead(true);
                setCurrentPage(1);
              }}
            >
              💀 Mortas ({deadPlants.length})
            </Button>
          </div>

          {/* Filtros */}
          <Filters
            selectedPhase={selectedPhase}
            selectedGenetic={selectedGenetic}
            genetics={genetics}
            onPhaseChange={handlePhaseChange}
            onGeneticChange={handleGeneticChange}
            onClearFilters={handleClearFilters}
          />

          {/* Informações de paginação */}
          <div className="mb-4 text-sm text-gray-500">
            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredPlants.length)} de {filteredPlants.length} plantas
            {(selectedPhase || selectedGenetic) && (
              <span className="ml-4">
                (filtrado de {showDead ? deadPlants.length : activePlants.length} plantas)
              </span>
            )}
          </div>

          <div className="plants-section">
            {currentPlants.length === 0 ? (
              <EmptyState
                icon={showDead ? "💀" : "🌱"}
                message={
                  filteredPlants.length === 0 && (selectedPhase || selectedGenetic)
                    ? "Nenhuma planta encontrada com os filtros aplicados"
                    : showDead
                      ? "Nenhuma planta morta"
                      : "Nenhuma planta ativa cadastrada ainda"
                }
                action={
                  filteredPlants.length === 0 && (selectedPhase || selectedGenetic)
                    ? { label: 'Limpar Filtros', onClick: handleClearFilters }
                    : !showDead
                      ? { label: 'Cadastrar Primeira Planta', onClick: () => navigate('/new') }
                      : undefined
                }
              />
            ) : (
              <>
                <div className="grid grid-3">
                  {currentPlants.map(plant => (
                    <PlantCard
                      key={plant.id || plant.code}
                      plant={plant}
                      onClick={() => plant.id && handlePlantClick(plant.id)}
                    />
                  ))}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
