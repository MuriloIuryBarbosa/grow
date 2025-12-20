import { useState, useEffect } from 'react';
import { sensorsAPI } from '../services/api';
import { Sensor, LatestSensorReading } from '../types';
import '../styles/sensors.css';

export default function SensorsManagement() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [latestReadings, setLatestReadings] = useState<LatestSensorReading[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'temperature_humidity' as 'temperature' | 'humidity' | 'temperature_humidity',
    location: '',
    description: '',
  });

  useEffect(() => {
    loadSensors();
    loadLatestReadings();
  }, []);

  const loadSensors = async () => {
    try {
      const data = await sensorsAPI.getAll(false);
      setSensors(data);
    } catch (err) {
      console.error('Erro ao carregar sensores:', err);
    }
  };

  const loadLatestReadings = async () => {
    try {
      const data = await sensorsAPI.getLatest();
      setLatestReadings(data);
    } catch (err) {
      console.error('Erro ao carregar leituras:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSensor) {
        await sensorsAPI.update(editingSensor.id!, {
          ...formData,
          is_active: editingSensor.is_active,
        });
      } else {
        await sensorsAPI.create(formData);
      }
      
      setShowForm(false);
      setEditingSensor(null);
      setFormData({ name: '', type: 'temperature_humidity', location: '', description: '' });
      loadSensors();
    } catch (err) {
      alert('Erro ao salvar sensor');
    }
  };

  const handleEdit = (sensor: Sensor) => {
    setEditingSensor(sensor);
    setFormData({
      name: sensor.name,
      type: sensor.type,
      location: sensor.location,
      description: sensor.description || '',
    });
    setShowForm(true);
  };

  const handleToggle = async (sensor: Sensor) => {
    try {
      await sensorsAPI.toggle(sensor.id!, sensor.is_active === 1 ? false : true);
      loadSensors();
      loadLatestReadings();
    } catch (err) {
      alert('Erro ao atualizar status do sensor');
    }
  };

  const handleDelete = async (sensor: Sensor) => {
    if (!confirm(`Tem certeza que deseja desativar o sensor "${sensor.name}"?`)) return;
    
    try {
      await sensorsAPI.delete(sensor.id!);
      loadSensors();
      loadLatestReadings();
    } catch (err) {
      alert('Erro ao deletar sensor');
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'temperature': return '🌡️ Temperatura';
      case 'humidity': return '💧 Umidade';
      case 'temperature_humidity': return '🌡️💧 Temp. e Umidade';
      default: return type;
    }
  };

  const getLatestReading = (sensorId: number) => {
    return latestReadings.find(r => r.sensor_id === sensorId);
  };

  return (
    <div className="sensors-management">
      <div className="sensors-header">
        <h2>⚙️ Gerenciar Sensores</h2>
        <button 
          className="btn-primary"
          onClick={() => {
            setShowForm(!showForm);
            setEditingSensor(null);
            setFormData({ name: '', type: 'temperature_humidity', location: '', description: '' });
          }}
        >
          {showForm ? '✕ Cancelar' : '+ Novo Sensor'}
        </button>
      </div>

      {showForm && (
        <form className="sensor-form" onSubmit={handleSubmit}>
          <h3>{editingSensor ? 'Editar Sensor' : 'Novo Sensor'}</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Nome do Sensor *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Sensor Superior"
                required
              />
            </div>

            <div className="form-group">
              <label>Tipo *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  type: e.target.value as any 
                })}
                required
              >
                <option value="temperature_humidity">Temperatura e Umidade</option>
                <option value="temperature">Apenas Temperatura</option>
                <option value="humidity">Apenas Umidade</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Localização *</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ex: Próximo à iluminação"
              required
            />
          </div>

          <div className="form-group">
            <label>Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhes sobre a aplicação deste sensor..."
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingSensor ? 'Salvar Alterações' : 'Cadastrar Sensor'}
            </button>
          </div>
        </form>
      )}

      <div className="sensors-grid">
        {sensors.length === 0 ? (
          <div className="empty-state">
            <p>📡 Nenhum sensor cadastrado</p>
            <p>Adicione um sensor para começar o monitoramento</p>
          </div>
        ) : (
          sensors.map(sensor => {
            const reading = getLatestReading(sensor.id!);
            
            return (
              <div key={sensor.id} className={`sensor-card ${sensor.is_active ? 'active' : 'inactive'}`}>
                <div className="sensor-header">
                  <h3>{sensor.name}</h3>
                  <div className="sensor-status">
                    {sensor.is_active ? '🟢 Ativo' : '⚫ Inativo'}
                  </div>
                </div>

                <div className="sensor-info">
                  <p><strong>Tipo:</strong> {getTypeLabel(sensor.type)}</p>
                  <p><strong>Localização:</strong> {sensor.location}</p>
                  {sensor.description && (
                    <p className="sensor-description">{sensor.description}</p>
                  )}
                </div>

                {reading && (
                  <div className="latest-reading">
                    <h4>📊 Última Leitura</h4>
                    <div className="reading-values">
                      {reading.temperature !== null && reading.temperature !== undefined && (
                        <div className="reading-value">
                          <span className="value">{reading.temperature.toFixed(1)}°C</span>
                          <span className="label">Temperatura</span>
                        </div>
                      )}
                      {reading.humidity !== null && reading.humidity !== undefined && (
                        <div className="reading-value">
                          <span className="value">{reading.humidity.toFixed(1)}%</span>
                          <span className="label">Umidade</span>
                        </div>
                      )}
                    </div>
                    <p className="reading-time">
                      {new Date(reading.recorded_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}

                <div className="sensor-actions">
                  <button 
                    className="btn-edit"
                    onClick={() => handleEdit(sensor)}
                  >
                    ✏️ Editar
                  </button>
                  <button 
                    className="btn-toggle"
                    onClick={() => handleToggle(sensor)}
                  >
                    {sensor.is_active ? '⏸️ Desativar' : '▶️ Ativar'}
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDelete(sensor)}
                  >
                    🗑️ Remover
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
