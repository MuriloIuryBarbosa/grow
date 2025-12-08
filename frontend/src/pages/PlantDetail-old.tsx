import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { usePlant } from '../hooks/usePlants';
import { useRecords } from '../hooks/useRecords';
import { plantsAPI } from '../services/api';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '../utils/date.utils';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import RecordCard from '../components/RecordCard';
import GrowthCharts from '../components/GrowthCharts';
import EmptyState from '../components/EmptyState';

export default function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plantId = parseInt(id || '0');
  
  const { plant, loading: plantLoading, error: plantError, refetch: refetchPlant } = usePlant(plantId);
  const { records, loading: recordsLoading } = useRecords(plantId);

  if (plantLoading) return <Loading message="Carregando planta..." />;
  if (plantError) return <ErrorMessage message={plantError} onRetry={refetchPlant} />;
  if (!plant) return <ErrorMessage message="Planta não encontrada" />;

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta planta?')) return;
    try {
      await plantsAPI.delete(plantId);
      navigate('/');
    } catch (err) {
      alert('Erro ao excluir planta');
    }
  };

  const handlePhaseChange = async (phase: typeof plant.current_phase) => {
    try {
      await plantsAPI.updatePhase(plantId, phase);
      refetchPlant();
    } catch (err) {
      alert('Erro ao atualizar fase');
    }
  };

  // Calcular dias totais desde o plantio
  const { totalDays, daysFromGermination, vegetationStartDate, currentPhaseDays } = useMemo(() => {
    const result = {
      totalDays: 0,
      daysFromGermination: null as number | null,
      vegetationStartDate: null as string | null,
      currentPhaseDays: 0
    };

    try {
      // Calcular dias totais desde o plantio
      if (plant.planting_date) {
        result.totalDays = differenceInDays(new Date(), parseDate(plant.planting_date));
      }
      
      // Calcular dias desde a germinação
      if (plant.germination_date) {
        result.daysFromGermination = differenceInDays(new Date(), parseDate(plant.germination_date));
      }
      
      // Encontrar data de início da fase vegetativa
      const vegetationPhase = plant.phase_history?.find(h => h.phase === 'vegetacao');
      result.vegetationStartDate = vegetationPhase?.started_at || null;
      
      // Calcular dias na fase atual
      if (!plant.phase_history || plant.phase_history.length === 0) {
        const startDate = plant.germination_date || plant.planting_date;
        if (startDate) {
          result.currentPhaseDays = differenceInDays(new Date(), parseDate(startDate));
        }
      } else {
        const currentPhaseEntry = plant.phase_history.find(
          h => h.phase === plant.current_phase && !h.ended_at
        );
        
        if (currentPhaseEntry && currentPhaseEntry.started_at) {
          const startDate = parseDate(currentPhaseEntry.started_at);
          const days = differenceInDays(new Date(), startDate);
          result.currentPhaseDays = days >= 0 ? days : 0;
        }
      }
    } catch (err) {
      console.error('Error calculating plant statistics:', err, plant);
    }

    return result;
  }, [plant.planting_date, plant.germination_date, plant.phase_history, plant.current_phase]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await fetch(`http://localhost:3000/plants/${plantId}/photo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Erro ao fazer upload da foto');
      
      refetchPlant();
      alert('Foto atualizada com sucesso!');
    } catch (err) {
      alert('Erro ao fazer upload da foto');
    }
  };

  return (
    <div className="container">
      <button className="btn btn-outline btn-small mb-2" onClick={() => navigate('/')}>← Voltar</button>

      <div className="card mb-2">
        <div className="card-header">
          <h2>{plant.name}</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-small" onClick={() => navigate(`/plant/${plantId}/edit`)}>✏️ Editar</button>
            <button className="btn btn-danger btn-small" onClick={handleDelete}>🗑️ Excluir</button>
          </div>
        </div>

        <div className="card-content">
          {/* Foto de perfil da planta */}
          <div style={{ marginBottom: '1.5rem' }}>
            {plant.photo_path ? (
              <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                <img 
                  src={`http://localhost:3000${plant.photo_path}`}
                  alt={plant.name}
                  style={{ 
                    width: '100%', 
                    height: '300px',
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }}
                />
                <label 
                  htmlFor="plant-photo-upload" 
                  className="btn btn-primary btn-small"
                  style={{ 
                    position: 'absolute', 
                    bottom: '1rem', 
                    right: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  📷 Alterar Foto
                </label>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg)', borderRadius: '8px' }}>
                <p style={{ marginBottom: '1rem', color: 'var(--text-light)' }}>Nenhuma foto de perfil</p>
                <label htmlFor="plant-photo-upload" className="btn btn-primary btn-small" style={{ cursor: 'pointer' }}>
                  📷 Adicionar Foto
                </label>
              </div>
            )}
            <input 
              type="file" 
              id="plant-photo-upload" 
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
          </div>

          <div className="grid grid-3">
            <div><strong>Código:</strong><p>{plant.code}</p></div>
            {plant.genetic && <div><strong>Genética:</strong><p>{plant.genetic}</p></div>}
            <div><strong>Substrato:</strong><p>{plant.substrate}</p></div>
            {plant.current_location && <div><strong>Localização:</strong><p>{plant.current_location}</p></div>}
            <div><strong>Data de Plantio:</strong><p>{format(parseDate(plant.planting_date), 'dd/MM/yyyy', { locale: ptBR })}</p></div>
            {plant.germination_date && (
              <div><strong>Data de Germinação:</strong><p>{format(parseDate(plant.germination_date), 'dd/MM/yyyy', { locale: ptBR })}</p></div>
            )}
            {vegetationStartDate && (
              <div><strong>Início Fase Vegetativa:</strong><p>{format(parseDate(vegetationStartDate), 'dd/MM/yyyy', { locale: ptBR })}</p></div>
            )}
          </div>

          {/* Estatísticas de tempo */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg)', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>⏱️ Tempo de Vida</h3>
            <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              <div className="stat-card">
                <div className="stat-label">Total desde Plantio</div>
                <div className="stat-value">{totalDays} dias</div>
              </div>
              {daysFromGermination !== null && (
                <div className="stat-card">
                  <div className="stat-label">Desde Germinação</div>
                  <div className="stat-value">{daysFromGermination} dias</div>
                </div>
              )}
              {plant.current_phase && currentPhaseDays >= 0 && (
                <div className="stat-card">
                  <div className="stat-label">
                    {plant.current_phase === 'germinacao' && 'Em Germinação'}
                    {plant.current_phase === 'muda' && 'Em Muda'}
                    {plant.current_phase === 'vegetacao' && 'Em Vegetação'}
                    {plant.current_phase === 'floracao' && 'Em Floração'}
                  </div>
                  <div className="stat-value">{currentPhaseDays} dias</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-2">
            <strong>Alterar Fase:</strong>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {(['germinacao', 'muda', 'vegetacao', 'floracao'] as const).map(phase => (
                <button
                  key={phase}
                  className={`btn btn-small ${plant.current_phase === phase ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handlePhaseChange(phase)}
                >
                  {phase === 'germinacao' && '🌱 Germinação'}
                  {phase === 'muda' && '🌿 Muda'}
                  {phase === 'vegetacao' && '🌿 Vegetativa'}
                  {phase === 'floracao' && '🌸 Floração'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos de Evolução */}
      {records.length > 0 && (
        <GrowthCharts records={records} plant={plant} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0 1rem' }}>
        <h3>📊 Registros Diários</h3>
        <button className="btn btn-primary btn-small" onClick={() => navigate(`/plant/${plantId}/new-record`)}>➕ Novo Registro</button>
      </div>

      {recordsLoading ? (
        <Loading message="Carregando registros..." />
      ) : records.length === 0 ? (
        <EmptyState icon="📊" message="Nenhum registro ainda" action={{ label: 'Criar Primeiro Registro', onClick: () => navigate(`/plant/${plantId}/new-record`) }} />
      ) : (
        <div className="timeline-scroll">
          {records.map(record => (
            <div key={record.id} className="timeline-item">
              <RecordCard 
                record={record} 
                onClick={() => navigate(`/plant/${plantId}/record/${record.id}/edit`)} 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
