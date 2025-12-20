import { Genetic } from '../hooks/useGenetics';

interface FiltersProps {
  selectedPhase: string;
  selectedGenetic: string;
  genetics: Genetic[];
  onPhaseChange: (phase: string) => void;
  onGeneticChange: (genetic: string) => void;
  onClearFilters: () => void;
}

const phases = [
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
    <div className="filters">
      <div className="filter-group">
        <label className="filter-label">Fase da Planta</label>
        <select
          className="filter-select"
          value={selectedPhase}
          onChange={(e) => onPhaseChange(e.target.value)}
        >
          {phases.map((phase) => (
            <option key={phase.value} value={phase.value}>
              {phase.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Genética</label>
        <select
          className="filter-select"
          value={selectedGenetic}
          onChange={(e) => onGeneticChange(e.target.value)}
        >
          <option value="">Todas as genéticas</option>
          {genetics.map((genetic) => (
            <option key={genetic.id} value={genetic.name}>
              {genetic.name}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <button
          className="btn btn-outline btn-small"
          onClick={onClearFilters}
          style={{ alignSelf: 'flex-end' }}
        >
          🗑️ Limpar Filtros
        </button>
      )}
    </div>
  );
}