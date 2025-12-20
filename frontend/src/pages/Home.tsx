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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>🌱 Grow System</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline btn-small" onClick={() => navigate('/sensors')}>
            ⚙️ Sensores
          </button>
          <button className="btn btn-outline btn-small" onClick={() => navigate('/record-reading')}>
            📊 Registrar Leitura
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/new')}>
            ➕ Nova Planta
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '2rem', borderBottom: '2px solid #eee' }}>
        <button 
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleTabChange('dashboard')}
          style={{
            padding: '1rem 2rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'dashboard' ? '3px solid var(--primary)' : 'none',
            fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal',
            color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--text-light)',
          }}
        >
          📊 Dashboard
        </button>
        <button 
          className={`tab-button ${activeTab === 'plants' ? 'active' : ''}`}
          onClick={() => handleTabChange('plants')}
          style={{
            padding: '1rem 2rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'plants' ? '3px solid var(--primary)' : 'none',
            fontWeight: activeTab === 'plants' ? 'bold' : 'normal',
            color: activeTab === 'plants' ? 'var(--primary)' : 'var(--text-light)',
          }}
        >
          🌱 Minhas Plantas ({showDead ? deadPlants.length : activePlants.length})
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        <SensorDashboard />
      ) : (
        <>
          <div className="stats">
            <div className="stat-card">
              <div className="stat-label">Total de Plantas</div>
              <div className="stat-value">{plants.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Plantas Ativas</div>
              <div className="stat-value">{activePlants.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Germinação</div>
              <div className="stat-value">{stats.germinacao}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Muda</div>
              <div className="stat-value">{stats.muda}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Vegetativa</div>
              <div className="stat-value">{stats.vegetacao}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Floração</div>
              <div className="stat-value">{stats.floracao}</div>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <button 
              className={`btn ${!showDead ? 'btn-primary' : 'btn-outline'} btn-small`}
              onClick={() => {
                setShowDead(false);
                setCurrentPage(1);
              }}
              style={{ marginRight: '0.5rem' }}
            >
              🌱 Ativas ({activePlants.length})
            </button>
            <button 
              className={`btn ${showDead ? 'btn-primary' : 'btn-outline'} btn-small`}
              onClick={() => {
                setShowDead(true);
                setCurrentPage(1);
              }}
            >
              💀 Mortas ({deadPlants.length})
            </button>
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
          <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-light)' }}>
            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredPlants.length)} de {filteredPlants.length} plantas
            {(selectedPhase || selectedGenetic) && (
              <span style={{ marginLeft: '1rem' }}>
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
