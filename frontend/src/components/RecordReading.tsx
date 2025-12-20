import { useState, useEffect } from 'react';
import { sensorsAPI, readingsAPI } from '../services/api';
import { Sensor } from '../types';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import '../styles/sensors.css';

// Obter data/hora atual em Brasília formatada para input datetime-local
const getBrasiliaDateTime = () => {
  const brasiliaTime = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm");
  return brasiliaTime;
};

// Converter data/hora local do input para ISO string em Brasília
const convertToISOBrasilia = (dateTimeLocal: string) => {
  // dateTimeLocal está no formato "YYYY-MM-DDTHH:mm"
  // Adicionar segundos e criar como horário de Brasília
  const dateWithSeconds = `${dateTimeLocal}:00`;
  const brasiliaDate = toZonedTime(dateWithSeconds, 'America/Sao_Paulo');
  return formatInTimeZone(brasiliaDate, 'America/Sao_Paulo', "yyyy-MM-dd HH:mm:ss");
};

export default function RecordReading() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [formData, setFormData] = useState({
    sensor_id: '',
    temperature: '',
    humidity: '',
    recorded_at: getBrasiliaDateTime(),
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSensors();
  }, []);

  const loadSensors = async () => {
    try {
      const data = await sensorsAPI.getAll(false);
      setSensors(data);
      
      // Auto-selecionar primeiro sensor se existir
      if (data.length > 0 && !formData.sensor_id) {
        setFormData(prev => ({ ...prev, sensor_id: data[0].id!.toString() }));
      }
    } catch (err) {
      console.error('Erro ao carregar sensores:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sensor_id) {
      alert('Selecione um sensor');
      return;
    }

    if (!formData.temperature && !formData.humidity) {
      alert('Informe pelo menos temperatura ou umidade');
      return;
    }

    setSubmitting(true);

    try {
      // Converter data/hora local para formato ISO de Brasília
      const isoDateTime = convertToISOBrasilia(formData.recorded_at);
      
      await readingsAPI.create({
        sensor_id: parseInt(formData.sensor_id),
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        humidity: formData.humidity ? parseFloat(formData.humidity) : null,
        recorded_at: isoDateTime,
        notes: formData.notes || null,
      });

      alert('✅ Leitura registrada com sucesso!');
      
      // Limpar campos mas manter sensor e atualizar data/hora
      setFormData(prev => ({
        ...prev,
        temperature: '',
        humidity: '',
        recorded_at: getBrasiliaDateTime(),
        notes: '',
      }));
    } catch (err) {
      alert('Erro ao registrar leitura');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSensor = sensors.find(s => s.id?.toString() === formData.sensor_id);

  return (
    <div className="record-reading">
      <h2>📊 Registrar Leitura</h2>

      {sensors.length === 0 ? (
        <div className="empty-state">
          <p>📡 Nenhum sensor cadastrado</p>
          <p>Cadastre um sensor antes de registrar leituras</p>
        </div>
      ) : (
        <form className="reading-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Sensor *</label>
            <select
              value={formData.sensor_id}
              onChange={(e) => setFormData({ ...formData, sensor_id: e.target.value })}
              required
            >
              <option value="">Selecione um sensor</option>
              {sensors.map(sensor => (
                <option key={sensor.id} value={sensor.id}>
                  {sensor.name} - {sensor.location}
                </option>
              ))}
            </select>
          </div>

          {selectedSensor && (
            <div className="sensor-type-hint">
              <p>
                <strong>Tipo:</strong> {' '}
                {selectedSensor.type === 'temperature_humidity' && '🌡️💧 Temperatura e Umidade'}
                {selectedSensor.type === 'temperature' && '🌡️ Apenas Temperatura'}
                {selectedSensor.type === 'humidity' && '💧 Apenas Umidade'}
              </p>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>
                Temperatura (°C) 
                {selectedSensor?.type === 'temperature' && ' *'}
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                placeholder="Ex: 25.5"
                disabled={selectedSensor?.type === 'humidity'}
                required={selectedSensor?.type === 'temperature'}
              />
            </div>

            <div className="form-group">
              <label>
                Umidade (%)
                {selectedSensor?.type === 'humidity' && ' *'}
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.humidity}
                onChange={(e) => setFormData({ ...formData, humidity: e.target.value })}
                placeholder="Ex: 65.0"
                disabled={selectedSensor?.type === 'temperature'}
                required={selectedSensor?.type === 'humidity'}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Data e Hora (Horário de Brasília) *</label>
            <input
              type="datetime-local"
              value={formData.recorded_at}
              onChange={(e) => setFormData({ ...formData, recorded_at: e.target.value })}
              required
            />
            <small style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
              🕐 Fuso horário: America/São_Paulo (BRT/BRST - UTC-3)
            </small>
          </div>

          <div className="form-group">
            <label>Observações</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações sobre esta leitura..."
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? '⏳ Salvando...' : '💾 Registrar Leitura'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
