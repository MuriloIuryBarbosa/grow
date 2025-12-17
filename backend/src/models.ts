import db from './database';
import { Plant, DailyRecord, PlantWithRecords, Statistics, PhaseHistory } from './types';
import { differenceInDays, parseISO, format } from 'date-fns';

export const PhaseHistoryModel = {
  // Criar novo registro de fase
  create(history: Omit<PhaseHistory, 'id' | 'created_at'>): PhaseHistory {
    const stmt = db.prepare(`
      INSERT INTO phase_history (plant_id, phase, started_at, ended_at, duration_days, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      history.plant_id,
      history.phase,
      history.started_at,
      history.ended_at || null,
      history.duration_days || null,
      history.notes || null
    );

    return { ...history, id: info.lastInsertRowid as number };
  },

  // Finalizar fase atual (adicionar ended_at e calcular duration)
  endPhase(plantId: number, phase: string, endDate: string): boolean {
    const stmt = db.prepare(`
      UPDATE phase_history 
      SET ended_at = ?, 
          duration_days = (julianday(?) - julianday(started_at))
      WHERE plant_id = ? AND phase = ? AND ended_at IS NULL
    `);
    const info = stmt.run(endDate, endDate, plantId, phase);
    return info.changes > 0;
  },

  // Buscar histórico de uma planta
  findByPlantId(plantId: number): PhaseHistory[] {
    const stmt = db.prepare('SELECT * FROM phase_history WHERE plant_id = ? ORDER BY started_at ASC');
    return stmt.all(plantId) as PhaseHistory[];
  },

  // Buscar fase atual de uma planta
  getCurrentPhase(plantId: number): PhaseHistory | undefined {
    const stmt = db.prepare('SELECT * FROM phase_history WHERE plant_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1');
    return stmt.get(plantId) as PhaseHistory | undefined;
  },

  // Calcular duração média de cada fase
  getAveragePhaseDurations(): { germinacao?: number; muda?: number; vegetacao?: number; floracao?: number } {
    const stmt = db.prepare(`
      SELECT phase, AVG(duration_days) as avg_duration
      FROM phase_history
      WHERE ended_at IS NOT NULL
      GROUP BY phase
    `);
    const results = stmt.all() as { phase: string; avg_duration: number }[];
    
    const durations: any = {};
    results.forEach(r => {
      durations[r.phase] = Math.round(r.avg_duration);
    });
    return durations;
  }
};

export const PlantModel = {
  // Criar nova planta
  create(plant: Omit<Plant, 'id' | 'created_at'>): Plant {
    // Calcular dias de germinação se ambas as datas estiverem presentes
    let daysToGermination = plant.days_to_germination;
    if (plant.germination_date && plant.planting_date && !daysToGermination) {
      daysToGermination = differenceInDays(
        parseISO(plant.planting_date),
        parseISO(plant.germination_date)
      );
    }

    // Determinar fase inicial baseada nas datas
    let initialPhase = plant.current_phase || 'germinacao';
    if (plant.germination_date && plant.planting_date) {
      // Se tem ambas as datas, já está na fase de muda
      initialPhase = 'muda';
    } else if (plant.germination_date) {
      // Se tem apenas data de germinação, está germinando
      initialPhase = 'germinacao';
    }

    const stmt = db.prepare(`
      INSERT INTO plants (name, genetic, code, planting_date, germination_date, 
                         days_to_germination, substrate, substrate_other, current_phase, 
                         current_location, status, photo_path, seed_batch_id, origin_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      plant.name,
      plant.genetic || null,
      plant.code,
      plant.planting_date,
      plant.germination_date || null,
      daysToGermination || null,
      plant.substrate,
      plant.substrate_other || null,
      initialPhase,
      plant.current_location || null,
      'ativa',
      plant.photo_path || null,
      plant.seed_batch_id || null,
      plant.seed_batch_id ? 'seed' : (plant.origin_type || 'unknown')
    );

    const plantId = info.lastInsertRowid as number;

    // Criar registro inicial no histórico de fases
    const startDate = plant.germination_date || plant.planting_date;
    PhaseHistoryModel.create({
      plant_id: plantId,
      phase: initialPhase,
      started_at: startDate,
      notes: 'Fase inicial no cadastro'
    });

    return { ...plant, id: plantId, current_phase: initialPhase, days_to_germination: daysToGermination };
  },

  // Buscar todas as plantas
  findAll(): Plant[] {
    const stmt = db.prepare('SELECT * FROM plants ORDER BY created_at DESC');
    return stmt.all() as Plant[];
  },

  // Buscar planta por ID (com dados do lote de sementes)
  findById(id: number): Plant | undefined {
    const stmt = db.prepare(`
      SELECT p.*, 
             sb.batch_code as seed_batch_code,
             gs.name as genetic_strain_name,
             gs.breeder as genetic_breeder
      FROM plants p
      LEFT JOIN seed_batches sb ON p.seed_batch_id = sb.id
      LEFT JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id
      WHERE p.id = ?
    `);
    return stmt.get(id) as Plant | undefined;
  },

  // Buscar planta por código
  findByCode(code: string): Plant | undefined {
    const stmt = db.prepare('SELECT * FROM plants WHERE code = ?');
    return stmt.get(code) as Plant | undefined;
  },

  // Buscar planta com detalhes completos (registros e histórico de fases)
  findByIdWithDetails(id: number): PlantWithRecords | undefined {
    const plant = this.findById(id);
    if (!plant) return undefined;

    const records = DailyRecordModel.findByPlantId(id);
    const phaseHistory = PhaseHistoryModel.findByPlantId(id);
    const currentPhaseHistory = PhaseHistoryModel.getCurrentPhase(id);

    // Calcular tempo na fase atual
    let daysInCurrentPhase = 0;
    if (currentPhaseHistory) {
      // Usar a data de início da fase atual do histórico
      daysInCurrentPhase = differenceInDays(new Date(), parseISO(currentPhaseHistory.started_at));
    } else if (plant.current_phase === 'germinacao' && plant.germination_date) {
      // Fallback: se não há histórico mas está em germinação, usar germination_date
      daysInCurrentPhase = differenceInDays(new Date(), parseISO(plant.germination_date));
    } else if (plant.current_phase === 'muda' && plant.planting_date) {
      // Fallback: se não há histórico mas está em muda, usar planting_date
      daysInCurrentPhase = differenceInDays(new Date(), parseISO(plant.planting_date));
    }

    // Calcular duração de cada fase já completada
    const phaseDurations: any = {};
    phaseHistory.forEach(ph => {
      if (ph.ended_at && ph.duration_days) {
        phaseDurations[ph.phase] = Math.round(ph.duration_days);
      }
    });

    return {
      ...plant,
      records,
      phase_history: phaseHistory,
      stats: {
        days_in_current_phase: daysInCurrentPhase,
        phase_durations: phaseDurations
      }
    };
  },

  // Atualizar planta
  update(id: number, plant: Partial<Plant>): boolean {
    const existingPlant = this.findById(id);
    if (!existingPlant) return false;

    const fields = [];
    const values = [];

    // Verificar se houve mudança nas datas críticas
    const datesChanged = (plant.germination_date !== undefined && plant.germination_date !== existingPlant.germination_date) ||
                         (plant.planting_date !== undefined && plant.planting_date !== existingPlant.planting_date);

    if (plant.name !== undefined) {
      fields.push('name = ?');
      values.push(plant.name);
    }
    if (plant.genetic !== undefined) {
      fields.push('genetic = ?');
      values.push(plant.genetic);
    }
    if (plant.germination_date !== undefined) {
      fields.push('germination_date = ?');
      values.push(plant.germination_date);
    }
    if (plant.planting_date !== undefined) {
      fields.push('planting_date = ?');
      values.push(plant.planting_date);
    }
    
    // Recalcular dias de germinação e fase se necessário
    const finalGermDate = plant.germination_date !== undefined ? plant.germination_date : existingPlant.germination_date;
    const finalPlantDate = plant.planting_date !== undefined ? plant.planting_date : existingPlant.planting_date;
    
    let newPhase = existingPlant.current_phase;
    if (datesChanged) {
      // Recalcular fase baseada nas novas datas
      if (finalGermDate && finalPlantDate) {
        newPhase = 'muda'; // Tem ambas as datas
        const days = differenceInDays(
          parseISO(finalPlantDate),
          parseISO(finalGermDate)
        );
        fields.push('days_to_germination = ?');
        values.push(days);
      } else if (finalGermDate) {
        newPhase = 'germinacao'; // Só tem data de germinação
      }

      // Se a fase mudou automaticamente, atualizar
      if (newPhase !== existingPlant.current_phase) {
        fields.push('current_phase = ?');
        values.push(newPhase);
        
        // Finalizar fase anterior e criar nova
        const today = format(new Date(), 'yyyy-MM-dd');
        PhaseHistoryModel.endPhase(id, existingPlant.current_phase, today);
        PhaseHistoryModel.create({
          plant_id: id,
          phase: newPhase,
          started_at: finalGermDate || finalPlantDate,
          notes: 'Recalculada automaticamente após atualização de datas'
        });
      }
    } else if (finalGermDate && finalPlantDate) {
      // Recalcular dias de germinação mesmo sem mudança de fase
      const days = differenceInDays(
        parseISO(finalPlantDate),
        parseISO(finalGermDate)
      );
      fields.push('days_to_germination = ?');
      values.push(days);
    }
    if (plant.substrate !== undefined) {
      fields.push('substrate = ?');
      values.push(plant.substrate);
    }
    if (plant.substrate_other !== undefined) {
      fields.push('substrate_other = ?');
      values.push(plant.substrate_other);
    }
    if (plant.current_phase !== undefined && plant.current_phase !== newPhase) {
      // Mudança manual de fase (diferente da automática)
      const oldPhase = newPhase; // Usar a fase recalculada ou existente
      if (oldPhase !== plant.current_phase) {
        const today = format(new Date(), 'yyyy-MM-dd');
        PhaseHistoryModel.endPhase(id, oldPhase, today);
        PhaseHistoryModel.create({
          plant_id: id,
          phase: plant.current_phase,
          started_at: today,
          notes: 'Mudança manual de fase'
        });
      }
      fields.push('current_phase = ?');
      values.push(plant.current_phase);
    }
    if (plant.current_location !== undefined) {
      fields.push('current_location = ?');
      values.push(plant.current_location);
    }
    if (plant.photo_path !== undefined) {
      fields.push('photo_path = ?');
      values.push(plant.photo_path);
    }
    if (plant.profile_photo !== undefined) {
      fields.push('profile_photo = ?');
      values.push(plant.profile_photo);
    }
    if (plant.code !== undefined) {
      fields.push('code = ?');
      values.push(plant.code);
    }
    if (plant.status !== undefined) {
      fields.push('status = ?');
      values.push(plant.status);
    }
    if (plant.failure_date !== undefined) {
      fields.push('failure_date = ?');
      values.push(plant.failure_date);
    }
    if (plant.failure_reason !== undefined) {
      fields.push('failure_reason = ?');
      values.push(plant.failure_reason);
    }
    if (plant.seed_batch_id !== undefined) {
      fields.push('seed_batch_id = ?');
      values.push(plant.seed_batch_id);
      // Atualizar origin_type se seed_batch_id for definido
      if (plant.seed_batch_id) {
        fields.push('origin_type = ?');
        values.push('seed');
      }
    }
    if (plant.origin_type !== undefined) {
      fields.push('origin_type = ?');
      values.push(plant.origin_type);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const stmt = db.prepare(`UPDATE plants SET ${fields.join(', ')} WHERE id = ?`);
    const info = stmt.run(...values);
    return info.changes > 0;
  },

  // Deletar planta
  delete(id: number): boolean {
    const stmt = db.prepare('DELETE FROM plants WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  },

  // Buscar plantas por fase
  findByPhase(phase: string): Plant[] {
    const stmt = db.prepare('SELECT * FROM plants WHERE current_phase = ? ORDER BY created_at DESC');
    return stmt.all(phase) as Plant[];
  }
};

export const DailyRecordModel = {
  // Criar registro diário
  create(record: Omit<DailyRecord, 'id' | 'created_at'>): DailyRecord {
    const stmt = db.prepare(`
      INSERT INTO daily_records (plant_id, record_date, plant_size, leaf_count, branch_count,
                                temperature, humidity, ppfd, vpd, fertilization, observations, location, photo_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      record.plant_id,
      record.record_date,
      record.plant_size || null,
      record.leaf_count || null,
      record.branch_count || null,
      record.temperature || null,
      record.humidity || null,
      record.ppfd || null,
      record.vpd || null,
      record.fertilization || null,
      record.observations || null,
      record.location || null,
      record.photo_path || null
    );

    // Atualizar o location da planta se fornecido
    if (record.location) {
      PlantModel.update(record.plant_id, { current_location: record.location });
    }

    return { ...record, id: info.lastInsertRowid as number };
  },

  // Buscar registros de uma planta
  findByPlantId(plantId: number): DailyRecord[] {
    const stmt = db.prepare('SELECT * FROM daily_records WHERE plant_id = ? ORDER BY record_date DESC');
    return stmt.all(plantId) as DailyRecord[];
  },

  // Buscar todos os registros
  findAll(): DailyRecord[] {
    const stmt = db.prepare('SELECT * FROM daily_records ORDER BY record_date DESC');
    return stmt.all() as DailyRecord[];
  },

  // Buscar registro por ID
  findById(id: number): DailyRecord | undefined {
    const stmt = db.prepare('SELECT * FROM daily_records WHERE id = ?');
    return stmt.get(id) as DailyRecord | undefined;
  },

  // Atualizar registro
  update(id: number, record: Partial<DailyRecord>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(record).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return false;

    values.push(id);
    const stmt = db.prepare(`UPDATE daily_records SET ${fields.join(', ')} WHERE id = ?`);
    const info = stmt.run(...values);
    return info.changes > 0;
  },

  // Deletar registro
  delete(id: number): boolean {
    const stmt = db.prepare('DELETE FROM daily_records WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }
};

export const StatisticsModel = {
  // Obter estatísticas gerais
  getOverview(): Statistics {
    const totalPlants = db.prepare('SELECT COUNT(*) as count FROM plants').get() as { count: number };
    
    const byPhase = db.prepare(`
      SELECT current_phase, COUNT(*) as count 
      FROM plants 
      GROUP BY current_phase
    `).all() as Array<{ current_phase: string; count: number }>;

    const avgGermination = db.prepare(`
      SELECT AVG(days_to_germination) as avg 
      FROM plants 
      WHERE days_to_germination IS NOT NULL
    `).get() as { avg: number | null };

    const avgStats = db.prepare(`
      SELECT 
        AVG(temperature) as avg_temp,
        AVG(humidity) as avg_humidity,
        AVG(ppfd) as avg_ppfd,
        AVG(vpd) as avg_vpd
      FROM daily_records
      WHERE temperature IS NOT NULL OR humidity IS NOT NULL OR ppfd IS NOT NULL OR vpd IS NOT NULL
    `).get() as {
      avg_temp: number | null;
      avg_humidity: number | null;
      avg_ppfd: number | null;
      avg_vpd: number | null;
    };

    const phaseCount = {
      germinacao: 0,
      muda: 0,
      vegetacao: 0,
      floracao: 0
    };

    byPhase.forEach(p => {
      phaseCount[p.current_phase as keyof typeof phaseCount] = p.count;
    });

    const avgPhaseDurations = PhaseHistoryModel.getAveragePhaseDurations();

    return {
      total_plants: totalPlants.count,
      by_phase: phaseCount,
      avg_germination_days: avgGermination.avg || undefined,
      avg_temperature: avgStats.avg_temp || undefined,
      avg_humidity: avgStats.avg_humidity || undefined,
      avg_ppfd: avgStats.avg_ppfd || undefined,
      avg_vpd: avgStats.avg_vpd || undefined,
      avg_phase_durations: avgPhaseDurations
    };
  },

  // Obter estatísticas de uma planta específica
  getPlantStats(plantId: number) {
    const records = DailyRecordModel.findByPlantId(plantId);
    
    if (records.length === 0) {
      return null;
    }

    const stats = {
      total_records: records.length,
      avg_temperature: 0,
      avg_humidity: 0,
      avg_ppfd: 0,
      avg_vpd: 0,
      avg_growth_rate: 0,
      latest_size: records[0].plant_size || 0
    };

    let tempCount = 0, humCount = 0, ppfdCount = 0, vpdCount = 0;

    records.forEach(r => {
      if (r.temperature) { stats.avg_temperature += r.temperature; tempCount++; }
      if (r.humidity) { stats.avg_humidity += r.humidity; humCount++; }
      if (r.ppfd) { stats.avg_ppfd += r.ppfd; ppfdCount++; }
      if (r.vpd) { stats.avg_vpd += r.vpd; vpdCount++; }
    });

    if (tempCount > 0) stats.avg_temperature /= tempCount;
    if (humCount > 0) stats.avg_humidity /= humCount;
    if (ppfdCount > 0) stats.avg_ppfd /= ppfdCount;
    if (vpdCount > 0) stats.avg_vpd /= vpdCount;

    // Calcular taxa de crescimento
    const sizesWithDates = records
      .filter(r => r.plant_size)
      .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());

    if (sizesWithDates.length >= 2) {
      const first = sizesWithDates[0];
      const last = sizesWithDates[sizesWithDates.length - 1];
      const days = differenceInDays(parseISO(last.record_date), parseISO(first.record_date));
      if (days > 0) {
        stats.avg_growth_rate = ((last.plant_size || 0) - (first.plant_size || 0)) / days;
      }
    }

    return stats;
  }
};
