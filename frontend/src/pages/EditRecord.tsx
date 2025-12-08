import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recordsAPI } from '../services/api';
import { DailyRecord } from '../types';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

export default function EditRecord() {
  const { id, recordId } = useParams<{ id: string; recordId: string }>();
  const navigate = useNavigate();
  const plantId = parseInt(id || '0');
  const recordIdNum = parseInt(recordId || '0');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | undefined>();
  const [record, setRecord] = useState<DailyRecord | null>(null);

  const [formData, setFormData] = useState<Partial<DailyRecord>>({
    record_date: '',
    plant_size: undefined,
    leaf_count: undefined,
    branch_count: undefined,
    ppfd: undefined,
    vpd: undefined,
    fertilization: '',
    observations: '',
    location: '',
  });

  useEffect(() => {
    const loadRecord = async () => {
      try {
        setLoading(true);
        const data = await recordsAPI.getById(plantId, recordIdNum);
        setRecord(data);
        
        // Converter data para formato YYYY-MM-DD (sem timezone)
        let dateStr = data.record_date;
        if (dateStr) {
          // Se vier com horário, pegar só a parte da data
          dateStr = dateStr.split('T')[0];
        }
        
        setFormData({
          record_date: dateStr,
          plant_size: data.plant_size,
          leaf_count: data.leaf_count,
          branch_count: data.branch_count,
          ppfd: data.ppfd,
          vpd: data.vpd,
          fertilization: data.fertilization || '',
          observations: data.observations || '',
          location: data.location || '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar registro');
      } finally {
        setLoading(false);
      }
    };

    loadRecord();
  }, [plantId, recordIdNum]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await recordsAPI.update(plantId, recordIdNum, { ...formData, photo, photo_path: record?.photo_path });
      navigate(`/plant/${plantId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar registro');
    } finally {
      setSaving(false);
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
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    
    try {
      setSaving(true);
      await recordsAPI.delete(plantId, recordIdNum);
      navigate(`/plant/${plantId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir registro');
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Carregando registro..." />;
  if (error && !record) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="container">
      <h2>✏️ Editar Registro</h2>

      {error && <ErrorMessage message={error} />}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="record_date">Data do Registro *</label>
          <input
            type="date"
            id="record_date"
            name="record_date"
            value={formData.record_date}
            onChange={handleChange}
            required
          />
        </div>

        <h3>📏 Medidas da Planta</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="plant_size">Tamanho (cm)</label>
            <input
              type="number"
              id="plant_size"
              name="plant_size"
              step="0.1"
              value={formData.plant_size || ''}
              onChange={handleChange}
              placeholder="Ex: 15.5"
            />
          </div>

          <div className="form-group">
            <label htmlFor="leaf_count">Número de Folhas</label>
            <input
              type="number"
              id="leaf_count"
              name="leaf_count"
              value={formData.leaf_count || ''}
              onChange={handleChange}
              placeholder="Ex: 8"
            />
          </div>

          <div className="form-group">
            <label htmlFor="branch_count">Número de Ramos</label>
            <input
              type="number"
              id="branch_count"
              name="branch_count"
              value={formData.branch_count || ''}
              onChange={handleChange}
              placeholder="Ex: 4"
            />
          </div>
        </div>

        <h3>🌡️ Condições Ambientais</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ppfd">PPFD (µmol/m²/s)</label>
            <input
              type="number"
              id="ppfd"
              name="ppfd"
              step="0.1"
              value={formData.ppfd || ''}
              onChange={handleChange}
              placeholder="Ex: 400"
            />
          </div>

          <div className="form-group">
            <label htmlFor="vpd">VPD (kPa)</label>
            <input
              type="number"
              id="vpd"
              name="vpd"
              step="0.01"
              value={formData.vpd || ''}
              onChange={handleChange}
              placeholder="Ex: 1.2"
            />
          </div>
        </div>

        <h3>📝 Observações</h3>

        <div className="form-group">
          <label htmlFor="location">Localização</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Ex: Estufa principal"
          />
        </div>

        <div className="form-group">
          <label htmlFor="fertilization">Fertilização</label>
          <textarea
            id="fertilization"
            name="fertilization"
            value={formData.fertilization}
            onChange={handleChange}
            rows={3}
            placeholder="Descreva os fertilizantes aplicados..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="observations">Observações Gerais</label>
          <textarea
            id="observations"
            name="observations"
            value={formData.observations}
            onChange={handleChange}
            rows={4}
            placeholder="Notas sobre desenvolvimento, problemas, etc..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="photo">Foto</label>
          {record?.photo_path && !photo && (
            <div style={{ marginBottom: '0.5rem' }}>
              <img 
                src={`http://localhost:3000${record.photo_path}`}
                alt="Foto atual"
                style={{ maxWidth: '200px', borderRadius: '8px' }}
              />
              <p style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>Foto atual (selecione um arquivo para substituir)</p>
            </div>
          )}
          <input
            type="file"
            id="photo"
            name="photo"
            accept="image/*"
            onChange={handleChange}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : '💾 Salvar Alterações'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate(`/plant/${plantId}`)} disabled={saving}>
            ❌ Cancelar
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={saving} style={{ marginLeft: 'auto' }}>
            🗑️ Excluir Registro
          </button>
        </div>
      </form>
    </div>
  );
}
