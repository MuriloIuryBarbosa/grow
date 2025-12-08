import { DailyRecord } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecordCardProps {
  record: DailyRecord;
  onClick: () => void;
}

export default function RecordCard({ record, onClick }: RecordCardProps) {
  // Parse da data corretamente para evitar problemas de timezone
  // Se a data vem como "2025-12-08", adicionar "T00:00:00" para forçar hora local
  const parseDate = (dateStr: string) => {
    if (!dateStr.includes('T')) {
      return new Date(dateStr + 'T00:00:00');
    }
    return new Date(dateStr);
  };

  return (
    <div className="card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="card-header">
        <h4 className="card-title">
          {format(parseDate(record.record_date), 'dd/MM/yyyy', { locale: ptBR })}
        </h4>
        {record.created_at && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
            {format(new Date(record.created_at), 'HH:mm', { locale: ptBR })}
          </span>
        )}
      </div>
      
      <div className="card-content">
        {record.plant_size && <p><strong>Tamanho:</strong> {record.plant_size} cm</p>}
        {record.leaf_count && <p><strong>Folhas:</strong> {record.leaf_count}</p>}
        {record.branch_count && <p><strong>Ramos:</strong> {record.branch_count}</p>}
        {record.temperature && <p><strong>Temperatura:</strong> {record.temperature}°C</p>}
        {record.humidity && <p><strong>Umidade:</strong> {record.humidity}%</p>}
        {record.ppfd && <p><strong>PPFD:</strong> {record.ppfd} µmol/m²/s</p>}
        {record.vpd && <p><strong>VPD:</strong> {record.vpd} kPa</p>}
        
        {record.photo_path && (
          <img 
            src={`http://localhost:3000${record.photo_path}`} 
            alt="Foto do registro" 
            style={{ 
              width: '100%', 
              borderRadius: '8px', 
              marginTop: '1rem',
              objectFit: 'cover',
              maxHeight: '200px'
            }} 
          />
        )}
        
        {record.observations && (
          <p className="mt-1"><em>{record.observations}</em></p>
        )}
      </div>
    </div>
  );
}
