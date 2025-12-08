import { Plant } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { memo, useMemo } from 'react';

interface PlantCardProps {
  plant: Plant;
  onClick: () => void;
}

const phaseLabels: Record<Plant['current_phase'], string> = {
  germinacao: '🌱 Germinação',
  muda: '🌿 Muda',
  vegetacao: '🌿 Vegetativa',
  floracao: '🌸 Floração',
};

const phaseBadge: Record<Plant['current_phase'], string> = {
  germinacao: 'badge-warning',
  muda: 'badge-info',
  vegetacao: 'badge-success',
  floracao: 'badge-danger',
};

function PlantCard({ plant, onClick }: PlantCardProps) {
  const daysGrowing = useMemo(() => 
    Math.floor(
      (Date.now() - new Date(plant.planting_date).getTime()) / (1000 * 60 * 60 * 24)
    ),
    [plant.planting_date]
  );

  const plantingDateFormatted = useMemo(() => 
    format(new Date(plant.planting_date), 'dd/MM/yyyy', { locale: ptBR }),
    [plant.planting_date]
  );

  return (
    <div className="card" onClick={onClick} style={{ cursor: 'pointer' }}>
      {plant.photo_path && (
        <div style={{ 
          width: '100%', 
          height: '200px', 
          overflow: 'hidden',
          borderRadius: '8px 8px 0 0',
          marginBottom: '1rem'
        }}>
          <img 
            src={`http://localhost:3000${plant.photo_path}`}
            alt={plant.name}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
      
      <div className="card-header">
        <h3 className="card-title">{plant.name}</h3>
        <span className={`badge ${phaseBadge[plant.current_phase]}`}>
          {phaseLabels[plant.current_phase]}
        </span>
      </div>
      
      <div className="card-content">
        <p><strong>Código:</strong> {plant.code}</p>
        {plant.genetic && <p><strong>Genética:</strong> {plant.genetic}</p>}
        <p><strong>Substrato:</strong> {plant.substrate}</p>
        {plant.current_location && <p><strong>Localização:</strong> {plant.current_location}</p>}
        <p><strong>Plantio:</strong> {plantingDateFormatted}</p>
        <p><strong>Dias de cultivo:</strong> {daysGrowing} dias</p>
      </div>
    </div>
  );
}

export default memo(PlantCard);
