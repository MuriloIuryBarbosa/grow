import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { plantsAPI } from '../services/api';
import { Plant } from '../types';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

export default function EditPlant() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plantId = parseInt(id || '0');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plant, setPlant] = useState<Plant | null>(null);

  const [formData, setFormData] = useState<Partial<Plant>>({
    name: '',
    code: '',
    genetic: '',
    planting_date: '',
    germination_date: '',
    substrate: '',
    current_location: '',
    status: 'ativa',
  });

  useEffect(() => {
    const loadPlant = async () => {
      try {
        setLoading(true);
        const data = await plantsAPI.getById(plantId);
        setPlant(data);
        setFormData({
          name: data.name,
          code: data.code,
          genetic: data.genetic || '',
          planting_date: data.planting_date,
          germination_date: data.germination_date || '',
          substrate: data.substrate,
          current_location: data.current_location || '',
          status: data.status,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar planta');
      } finally {
        setLoading(false);
      }
    };

    loadPlant();
  }, [plantId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await plantsAPI.update(plantId, formData);
      navigate(`/plant/${plantId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar planta');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <Loading message="Carregando planta..." />;
  if (error && !plant) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="container">
      <h2>✏️ Editar Planta</h2>

      {error && <ErrorMessage message={error} />}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="name">Nome da Planta *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Ex: Planta 1"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="code">Código *</label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              placeholder="Ex: P001"
            />
          </div>

          <div className="form-group">
            <label htmlFor="genetic">Genética</label>
            <input
              type="text"
              id="genetic"
              name="genetic"
              value={formData.genetic}
              onChange={handleChange}
              placeholder="Ex: Sativa dominante"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="planting_date">Data de Plantio *</label>
            <input
              type="date"
              id="planting_date"
              name="planting_date"
              value={formData.planting_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="germination_date">Data de Germinação</label>
            <input
              type="date"
              id="germination_date"
              name="germination_date"
              value={formData.germination_date}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="substrate">Substrato *</label>
          <input
            type="text"
            id="substrate"
            name="substrate"
            value={formData.substrate}
            onChange={handleChange}
            required
            placeholder="Ex: Turfa e Perlita"
          />
        </div>

        <div className="form-group">
          <label htmlFor="current_location">Localização Atual</label>
          <input
            type="text"
            id="current_location"
            name="current_location"
            value={formData.current_location}
            onChange={handleChange}
            placeholder="Ex: Estufa principal"
          />
        </div>

        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="ativa">Ativa</option>
            <option value="morta">Morta</option>
            <option value="falha_germinacao">Falha na Germinação</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : '💾 Salvar Alterações'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate(`/plant/${plantId}`)} disabled={saving}>
            ❌ Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
