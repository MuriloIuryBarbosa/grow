export type PlantStatus = 'ativa' | 'morta' | 'falha_germinacao';
export type PlantPhase = 'germinacao' | 'muda' | 'vegetacao' | 'floracao';

export interface Plant {
  id?: number;
  name: string;
  genetic: string;
  code?: string;
  planting_date: string;
  germination_date?: string;
  days_to_germination?: number;
  substrate: string;
  substrate_other?: string;
  current_phase: PlantPhase;
  current_location: string;
  status: PlantStatus;
  failure_date?: string;
  failure_reason?: string;
  photo_path?: string;
  created_at?: string;
  records?: DailyRecord[];
  phase_history?: PhaseHistory[];
}

export interface DailyRecord {
  id?: number;
  plant_id: number;
  record_date: string;
  plant_size?: number;
  leaf_count?: number;
  branch_count?: number;
  temperature?: number;
  humidity?: number;
  ppfd?: number;
  vpd?: number;
  fertilization?: string;
  observations?: string;
  location?: string;
  photo_path?: string;
  created_at?: string;
}

export interface PhaseHistory {
  id?: number;
  plant_id: number;
  phase: PlantPhase;
  start_date: string;
  end_date?: string;
  days_in_phase?: number;
  notes?: string;
  created_at?: string;
}

export class PlantEntity implements Plant {
  id?: number;
  name: string;
  genetic: string;
  code?: string;
  planting_date: string;
  germination_date?: string;
  days_to_germination?: number;
  substrate: string;
  substrate_other?: string;
  current_phase: PlantPhase;
  current_location: string;
  status: PlantStatus;
  failure_date?: string;
  failure_reason?: string;
  photo_path?: string;
  created_at?: string;
  records?: DailyRecord[];
  phase_history?: PhaseHistory[];

  constructor(data: Plant) {
    this.id = data.id;
    this.name = data.name;
    this.genetic = data.genetic;
    this.code = data.code;
    this.planting_date = data.planting_date;
    this.germination_date = data.germination_date;
    this.days_to_germination = data.days_to_germination;
    this.substrate = data.substrate;
    this.substrate_other = data.substrate_other;
    this.current_phase = data.current_phase;
    this.current_location = data.current_location;
    this.status = data.status || 'ativa';
    this.failure_date = data.failure_date;
    this.failure_reason = data.failure_reason;
    this.photo_path = data.photo_path;
    this.created_at = data.created_at;
    this.records = data.records;
    this.phase_history = data.phase_history;
  }

  isActive(): boolean {
    return this.status === 'ativa';
  }

  hasGerminated(): boolean {
    return !!this.germination_date;
  }

  getDaysInCurrentPhase(): number {
    if (!this.phase_history || this.phase_history.length === 0) return 0;
    
    const currentHistory = this.phase_history
      .filter(h => h.phase === this.current_phase && !h.end_date)
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];
    
    if (!currentHistory) return 0;
    
    const start = new Date(currentHistory.start_date);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  getTotalGrowthDays(): number {
    const startDate = this.germination_date || this.planting_date;
    const start = new Date(startDate);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
}
