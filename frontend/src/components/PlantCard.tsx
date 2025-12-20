import React, { memo, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plant, PlantPhase } from '../types';
import { Card, CardContent, CardHeader, Badge } from './ui';
import { cn } from '../utils/cn';

interface PlantCardProps {
  plant: Plant;
  onClick: () => void;
  className?: string;
}

const phaseConfig: Record<PlantPhase, { label: string; variant: 'success' | 'warning' | 'info' | 'error' }> = {
  germinacao: { label: '🌱 Germinação', variant: 'warning' },
  muda: { label: '🌿 Muda', variant: 'info' },
  vegetacao: { label: '🌿 Vegetativa', variant: 'success' },
  floracao: { label: '🌸 Floração', variant: 'error' },
};

const statusConfig: Record<Plant['status'], { label: string; variant: 'success' | 'warning' | 'error' | 'secondary' }> = {
  ativa: { label: 'Ativa', variant: 'success' },
  morta: { label: 'Morta', variant: 'error' },
  colhida: { label: 'Colhida', variant: 'secondary' },
  falha_germinacao: { label: 'Falha Germinação', variant: 'warning' },
};

function PlantCard({ plant, onClick, className }: PlantCardProps) {
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

  const germinationDateFormatted = useMemo(() => {
    if (!plant.germination_date) return null;
    return format(new Date(plant.germination_date), 'dd/MM/yyyy', { locale: ptBR });
  }, [plant.germination_date]);

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
        className
      )}
      onClick={onClick}
    >
      {plant.photo_path && (
        <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
          <img
            src={`http://localhost:3000${plant.photo_path}`}
            alt={plant.name}
            className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-gray-900 truncate">
              {plant.name}
            </h3>
            <p className="text-sm text-gray-500 font-mono">
              {plant.code}
            </p>
          </div>
          <Badge variant={statusConfig[plant.status].variant} className="shrink-0">
            {statusConfig[plant.status].label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant={phaseConfig[plant.current_phase].variant}>
              {phaseConfig[plant.current_phase].label}
            </Badge>
            <span className="text-sm text-gray-600">
              {daysGrowing} dias
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Plantio:</span>
              <p className="font-medium">{plantingDateFormatted}</p>
            </div>
            {plant.genetic && (
              <div>
                <span className="text-gray-500">Genética:</span>
                <p className="font-medium truncate">{plant.genetic}</p>
              </div>
            )}
          </div>

          {germinationDateFormatted && (
            <div className="text-sm">
              <span className="text-gray-500">Germinação:</span>
              <p className="font-medium text-green-600">{germinationDateFormatted}</p>
            </div>
          )}

          <div className="text-sm">
            <span className="text-gray-500">Substrato:</span>
            <p className="font-medium">{plant.substrate}</p>
          </div>

          {plant.current_location && (
            <div className="text-sm">
              <span className="text-gray-500">Localização:</span>
              <p className="font-medium">{plant.current_location}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(PlantCard);
