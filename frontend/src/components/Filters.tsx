import React from 'react';
import { Genetic } from '../hooks/useGenetics';
import { Select, Button } from './ui';

interface FiltersProps {
  selectedPhase: string;
  selectedGenetic: string;
  genetics: Genetic[];
  onPhaseChange: (phase: string) => void;
  onGeneticChange: (genetic: string) => void;
  onClearFilters: () => void;
}

const phases: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todas as fases' },
  { value: 'germinacao', label: '🌱 Germinação' },
  { value: 'muda', label: '🌿 Muda' },
  { value: 'vegetacao', label: '🌿 Vegetativa' },
  { value: 'floracao', label: '🌸 Floração' },
];

export default function Filters({
  selectedPhase,
  selectedGenetic,
  genetics,
  onPhaseChange,
  onGeneticChange,
  onClearFilters,
}: FiltersProps) {
  const hasActiveFilters = selectedPhase || selectedGenetic;

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg border">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fase da Planta
        </label>
        <Select
          value={selectedPhase}
          onChange={(e) => onPhaseChange(e.target.value)}
          className="w-full"
        >
          {phases.map((phase) => (
            <option key={phase.value} value={phase.value}>
              {phase.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Genética
        </label>
        <Select
          value={selectedGenetic}
          onChange={(e) => onGeneticChange(e.target.value)}
          className="w-full"
        >
          <option value="">Todas as genéticas</option>
          {genetics.map((genetic) => (
            <option key={genetic.id} value={genetic.name}>
              {genetic.name}
            </option>
          ))}
        </Select>
      </div>

      {hasActiveFilters && (
        <div className="flex items-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="whitespace-nowrap"
          >
            🗑️ Limpar Filtros
          </Button>
        </div>
      )}
    </div>
  );
}