import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { plantsAPI } from '../services/api';
import { Plant } from '../types';

export default function NewPlant() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Plant>>({
    name: '',
    genetic: '',
    code: '',
    planting_date: new Date().toISOString().split('T')[0],
    germination_date: '',
    substrate: '',
    current_phase: 'germinacao',
    current_location: '',
    status: 'ativa',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await plantsAPI.create(formData);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar planta');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="container">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '2rem' }}>➕ Nova Planta</h2>

        {error && (
          <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="name">Nome *</label>
              <input id="name" name="name" type="text" className="form-input" value={formData.name} onChange={handleChange} required placeholder="Ex: Planta #1" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="code">Código *</label>
              <input id="code" name="code" type="text" className="form-input" value={formData.code} onChange={handleChange} required placeholder="Ex: P001" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="genetic">Genética</label>
              <input id="genetic" name="genetic" type="text" className="form-input" value={formData.genetic} onChange={handleChange} placeholder="Ex: Sativa" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="substrate">Substrato *</label>
              <input id="substrate" name="substrate" type="text" className="form-input" value={formData.substrate} onChange={handleChange} required placeholder="Ex: Solo orgânico" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="planting_date">Data de Plantio *</label>
              <input id="planting_date" name="planting_date" type="date" className="form-input" value={formData.planting_date} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="germination_date">Data de Germinação</label>
              <input id="germination_date" name="germination_date" type="date" className="form-input" value={formData.germination_date} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="current_location">Localização</label>
              <input id="current_location" name="current_location" type="text" className="form-input" value={formData.current_location} onChange={handleChange} placeholder="Ex: Estufa 1" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="current_phase">Fase Atual *</label>
              <select id="current_phase" name="current_phase" className="form-select" value={formData.current_phase} onChange={handleChange} required>
                <option value="germinacao">🌱 Germinação</option>
                <option value="muda">🌿 Muda</option>
                <option value="vegetacao">🌿 Vegetativa</option>
                <option value="floracao">🌸 Floração</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/')} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Planta'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
