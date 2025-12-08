import { useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recordsAPI } from '../services/api';
import { DailyRecord } from '../types';

export default function NewRecord() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plantId = parseInt(id || '0');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | undefined>();

  const [formData, setFormData] = useState<Partial<DailyRecord>>({
    record_date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
    plant_size: undefined,
    leaf_count: undefined,
    branch_count: undefined,
    ppfd: undefined,
    vpd: undefined,
    fertilization: '',
    observations: '',
    location: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await recordsAPI.create(plantId, { ...formData, photo });
      navigate(`/plant/${plantId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar registro');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'file') {
      const file = (e.target as HTMLInputElement).files?.[0];
      setPhoto(file);
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value || undefined }));
    }
  };

  return (
    <div className="container">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button className="btn btn-outline btn-small mb-2" onClick={() => navigate(`/plants/${plantId}`)}>← Voltar</button>
        <h2 style={{ marginBottom: '2rem' }}>📊 Novo Registro Diário</h2>

        {error && (
          <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label className="form-label" htmlFor="record_date">Data *</label>
            <input id="record_date" name="record_date" type="date" className="form-input" value={formData.record_date} onChange={handleChange} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="plant_size">Tamanho (cm)</label>
              <input id="plant_size" name="plant_size" type="number" step="0.1" className="form-input" value={formData.plant_size || ''} onChange={handleChange} placeholder="Ex: 25.5" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="leaf_count">Número de Folhas</label>
              <input id="leaf_count" name="leaf_count" type="number" className="form-input" value={formData.leaf_count || ''} onChange={handleChange} placeholder="Ex: 12" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="branch_count">Número de Ramos</label>
              <input id="branch_count" name="branch_count" type="number" className="form-input" value={formData.branch_count || ''} onChange={handleChange} placeholder="Ex: 4" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="ppfd">PPFD (µmol/m²/s)</label>
              <input id="ppfd" name="ppfd" type="number" step="0.1" className="form-input" value={formData.ppfd || ''} onChange={handleChange} placeholder="Ex: 800" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="vpd">VPD (kPa)</label>
              <input id="vpd" name="vpd" type="number" step="0.01" className="form-input" value={formData.vpd || ''} onChange={handleChange} placeholder="Ex: 1.2" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="fertilization">Fertilização</label>
            <input id="fertilization" name="fertilization" type="text" className="form-input" value={formData.fertilization} onChange={handleChange} placeholder="Ex: NPK 10-10-10" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="location">Localização</label>
            <input id="location" name="location" type="text" className="form-input" value={formData.location} onChange={handleChange} placeholder="Ex: Estufa 1" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="observations">Observações</label>
            <textarea id="observations" name="observations" className="form-textarea" value={formData.observations} onChange={handleChange} placeholder="Observações sobre o dia..." />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="photo">Foto</label>
            <input id="photo" name="photo" type="file" accept="image/*" className="form-input" onChange={handleChange} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate(`/plants/${plantId}`)} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Registro'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
