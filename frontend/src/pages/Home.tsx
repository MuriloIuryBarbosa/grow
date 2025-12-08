import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlants } from '../hooks/usePlants';
import PlantCard from '../components/PlantCard';
import SensorDashboard from '../components/SensorDashboard';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';

export default function Home() {
  const navigate = useNavigate();
  const { plants, loading, error, refetch } = usePlants();
  const [showDead, setShowDead] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plants'>('dashboard');

  const activePlants = useMemo(() => plants.filter(p => p.status === 'ativa'), [plants]);
  const deadPlants = useMemo(() => plants.filter(p => p.status === 'morta'), [plants]);
  
  const stats = useMemo(() => ({
    germinacao: activePlants.filter(p => p.current_phase === 'germinacao').length,
    muda: activePlants.filter(p => p.current_phase === 'muda').length,
    vegetacao: activePlants.filter(p => p.current_phase === 'vegetacao').length,
    floracao: activePlants.filter(p => p.current_phase === 'floracao').length,
  }), [activePlants]);

  const handlePlantClick = useCallback((id: number) => {
    navigate(`/plant/${id}`);
  }, [navigate]);

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
          onClick={() => setActiveTab('dashboard')}
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
          onClick={() => setActiveTab('plants')}
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
          🌱 Minhas Plantas
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
              onClick={() => setShowDead(false)}
              style={{ marginRight: '0.5rem' }}
            >
              🌱 Ativas ({activePlants.length})
            </button>
            <button 
              className={`btn ${showDead ? 'btn-primary' : 'btn-outline'} btn-small`}
              onClick={() => setShowDead(true)}
            >
              💀 Mortas ({deadPlants.length})
            </button>
          </div>

          {!showDead ? (
            activePlants.length === 0 ? (
              <EmptyState
                icon="🌱"
                message="Nenhuma planta ativa cadastrada ainda"
                action={{
                  label: 'Cadastrar Primeira Planta',
                  onClick: () => navigate('/new'),
                }}
              />
            ) : (
              <div className="grid grid-2">
                {activePlants.map(plant => (
                  <PlantCard
                    key={plant.id}
                    plant={plant}
                    onClick={() => handlePlantClick(plant.id)}
                  />
                ))}
              </div>
            )
          ) : (
            deadPlants.length === 0 ? (
              <EmptyState
                icon="💀"
                message="Nenhuma planta morta"
              />
            ) : (
              <div className="grid grid-2">
                {deadPlants.map(plant => (
                  <PlantCard
                    key={plant.id}
                    plant={plant}
                    onClick={() => handlePlantClick(plant.id)}
                  />
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
