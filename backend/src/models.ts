import db from './database';
import { Plant, DailyRecord, PlantWithRecords, Statistics, PhaseHistory, GeneticStrain, SeedBatch, Clone } from './types';
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
  // Gerar código automático sequencial
  generateNextCode(): string {
    const stmt = db.prepare(`
      SELECT code FROM plants 
      WHERE code LIKE 'VASO%' 
      ORDER BY CAST(SUBSTR(code, 5) AS INTEGER) DESC 
      LIMIT 1
    `);
    
    const lastCode = stmt.get() as { code: string } | undefined;
    
    if (!lastCode) {
      return 'VASO001';
    }
    
    // Extrair o número do código (VASO001 -> 1)
    const match = lastCode.code.match(/^VASO(\d+)$/);
    if (!match) {
      return 'VASO001';
    }
    
    const nextNumber = parseInt(match[1]) + 1;
    return `VASO${nextNumber.toString().padStart(3, '0')}`;
  },

  // Criar nova planta
  create(plant: Omit<Plant, 'id' | 'created_at'>): Plant {
    // Gerar código automaticamente se não fornecido
    const code = plant.code || this.generateNextCode();

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
                         current_location, status, photo_path, seed_batch_id, origin_type, germination_recipe_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      plant.name,
      plant.genetic || null,
      code,
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
      plant.seed_batch_id ? 'seed' : (plant.origin_type || 'unknown'),
      plant.germination_recipe_id || null
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

    // Buscar receita de germinação se existir
    let germinationRecipe: Recipe | undefined;
    if (plant.germination_recipe_id) {
      germinationRecipe = RecipeModel.findById(plant.germination_recipe_id);
    }

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
      germination_recipe: germinationRecipe,
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
  },

  // Buscar registros com filtros avançados
  findWithFilters(filters: {
    plantIds?: number[];
    startDate?: string;
    endDate?: string;
    minSize?: number;
    maxSize?: number;
    phases?: string[];
    genetics?: string[];
  }): DailyRecord[] {
    let query = `
      SELECT dr.*, p.code as plant_code, p.genetic, p.current_phase
      FROM daily_records dr
      JOIN plants p ON dr.plant_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.plantIds && filters.plantIds.length > 0) {
      query += ` AND dr.plant_id IN (${filters.plantIds.map(() => '?').join(',')})`;
      params.push(...filters.plantIds);
    }

    if (filters.startDate) {
      query += ' AND dr.record_date >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND dr.record_date <= ?';
      params.push(filters.endDate);
    }

    if (filters.minSize !== undefined) {
      query += ' AND dr.plant_size >= ?';
      params.push(filters.minSize);
    }

    if (filters.maxSize !== undefined) {
      query += ' AND dr.plant_size <= ?';
      params.push(filters.maxSize);
    }

    if (filters.phases && filters.phases.length > 0) {
      query += ` AND p.current_phase IN (${filters.phases.map(() => '?').join(',')})`;
      params.push(...filters.phases);
    }

    if (filters.genetics && filters.genetics.length > 0) {
      query += ` AND p.genetic IN (${filters.genetics.map(() => '?').join(',')})`;
      params.push(...filters.genetics);
    }

    query += ' ORDER BY dr.record_date DESC, dr.plant_id ASC';

    const stmt = db.prepare(query);
    return stmt.all(...params) as (DailyRecord & { plant_code: string; genetic: string; current_phase: string })[];
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

// ============================================
// MODELOS DO BANCO GENÉTICO
// ============================================

export const GeneticStrainModel = {
  // Criar nova genética
  create(strain: Omit<GeneticStrain, 'id' | 'created_at' | 'updated_at'>): GeneticStrain {
    const stmt = db.prepare(`
      INSERT INTO genetic_strains (name, breeder, type, indica_percentage, sativa_percentage,
                                   flowering_time_min, flowering_time_max, height_indoor, height_outdoor,
                                   yield_indoor, yield_outdoor, difficulty, thc_percentage, cbd_percentage,
                                   flavors, effects, description, grow_notes, photo_path, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      strain.name,
      strain.breeder || null,
      strain.type || 'unknown',
      strain.indica_percentage || null,
      strain.sativa_percentage || null,
      strain.flowering_time_min || null,
      strain.flowering_time_max || null,
      strain.height_indoor || null,
      strain.height_outdoor || null,
      strain.yield_indoor || null,
      strain.yield_outdoor || null,
      strain.difficulty || null,
      strain.thc_percentage || null,
      strain.cbd_percentage || null,
      strain.flavors ? JSON.stringify(strain.flavors) : null,
      strain.effects ? JSON.stringify(strain.effects) : null,
      strain.description || null,
      strain.grow_notes || null,
      strain.photo_path || null,
      strain.is_active !== undefined ? strain.is_active : true
    );

    return { ...strain, id: info.lastInsertRowid as number };
  },

  // Buscar todas as genéticas ativas
  findAll(): GeneticStrain[] {
    const stmt = db.prepare('SELECT * FROM genetic_strains WHERE is_active = 1 ORDER BY name ASC');
    const results = stmt.all() as any[];
    
    // Parse JSON fields
    return results.map(strain => ({
      ...strain,
      flavors: strain.flavors ? JSON.parse(strain.flavors) : null,
      effects: strain.effects ? JSON.parse(strain.effects) : null,
    }));
  },

  // Buscar genética por ID
  findById(id: number): GeneticStrain | undefined {
    const stmt = db.prepare('SELECT * FROM genetic_strains WHERE id = ?');
    const result = stmt.get(id) as any;
    
    if (!result) return undefined;
    
    return {
      ...result,
      flavors: result.flavors ? JSON.parse(result.flavors) : null,
      effects: result.effects ? JSON.parse(result.effects) : null,
    };
  },

  // Buscar genética por nome
  findByName(name: string): GeneticStrain | undefined {
    const stmt = db.prepare('SELECT * FROM genetic_strains WHERE name = ? AND is_active = 1');
    const result = stmt.get(name) as any;
    
    if (!result) return undefined;
    
    return {
      ...result,
      flavors: result.flavors ? JSON.parse(result.flavors) : null,
      effects: result.effects ? JSON.parse(result.effects) : null,
    };
  },

  // Atualizar genética
  update(id: number, strain: Partial<GeneticStrain>): boolean {
    const existing = this.findById(id);
    if (!existing) return false;

    const fields = [];
    const values = [];

    if (strain.name !== undefined) { fields.push('name = ?'); values.push(strain.name); }
    if (strain.breeder !== undefined) { fields.push('breeder = ?'); values.push(strain.breeder); }
    if (strain.type !== undefined) { fields.push('type = ?'); values.push(strain.type); }
    if (strain.indica_percentage !== undefined) { fields.push('indica_percentage = ?'); values.push(strain.indica_percentage); }
    if (strain.sativa_percentage !== undefined) { fields.push('sativa_percentage = ?'); values.push(strain.sativa_percentage); }
    if (strain.flowering_time_min !== undefined) { fields.push('flowering_time_min = ?'); values.push(strain.flowering_time_min); }
    if (strain.flowering_time_max !== undefined) { fields.push('flowering_time_max = ?'); values.push(strain.flowering_time_max); }
    if (strain.height_indoor !== undefined) { fields.push('height_indoor = ?'); values.push(strain.height_indoor); }
    if (strain.height_outdoor !== undefined) { fields.push('height_outdoor = ?'); values.push(strain.height_outdoor); }
    if (strain.yield_indoor !== undefined) { fields.push('yield_indoor = ?'); values.push(strain.yield_indoor); }
    if (strain.yield_outdoor !== undefined) { fields.push('yield_outdoor = ?'); values.push(strain.yield_outdoor); }
    if (strain.difficulty !== undefined) { fields.push('difficulty = ?'); values.push(strain.difficulty); }
    if (strain.thc_percentage !== undefined) { fields.push('thc_percentage = ?'); values.push(strain.thc_percentage); }
    if (strain.cbd_percentage !== undefined) { fields.push('cbd_percentage = ?'); values.push(strain.cbd_percentage); }
    if (strain.flavors !== undefined) { fields.push('flavors = ?'); values.push(JSON.stringify(strain.flavors)); }
    if (strain.effects !== undefined) { fields.push('effects = ?'); values.push(JSON.stringify(strain.effects)); }
    if (strain.description !== undefined) { fields.push('description = ?'); values.push(strain.description); }
    if (strain.grow_notes !== undefined) { fields.push('grow_notes = ?'); values.push(strain.grow_notes); }
    if (strain.photo_path !== undefined) { fields.push('photo_path = ?'); values.push(strain.photo_path); }
    if (strain.is_active !== undefined) { fields.push('is_active = ?'); values.push(strain.is_active); }

    if (fields.length === 0) return true;

    fields.push('updated_at = datetime(\'now\', \'localtime\')');
    values.push(id);

    const stmt = db.prepare(`UPDATE genetic_strains SET ${fields.join(', ')} WHERE id = ?`);
    const info = stmt.run(...values);
    return info.changes > 0;
  },

  // Deletar genética (soft delete)
  delete(id: number): boolean {
    const stmt = db.prepare('UPDATE genetic_strains SET is_active = 0, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }
};

export const SeedBatchModel = {
  // Criar novo lote de sementes
  create(batch: Omit<SeedBatch, 'id' | 'created_at' | 'updated_at'>): SeedBatch {
    const stmt = db.prepare(`
      INSERT INTO seed_batches (genetic_strain_id, batch_code, source, source_type, acquisition_date,
                               initial_quantity, current_quantity, seed_type, generation, storage_location,
                               storage_conditions, expiration_date, germination_rate, plants_generated, notes, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      batch.genetic_strain_id,
      batch.batch_code,
      batch.source,
      batch.source_type || 'purchased',
      batch.acquisition_date,
      batch.initial_quantity,
      batch.current_quantity || batch.initial_quantity,
      batch.seed_type || 'regular',
      batch.generation || null,
      batch.storage_location || null,
      batch.storage_conditions || null,
      batch.expiration_date || null,
      batch.germination_rate || null,
      batch.plants_generated || 0,
      batch.notes || null,
      batch.is_active !== undefined ? batch.is_active : true
    );

    return { ...batch, id: info.lastInsertRowid as number };
  },

  // Buscar todos os lotes ativos
  findAll(): SeedBatch[] {
    const stmt = db.prepare(`
      SELECT sb.*, gs.name as genetic_name, gs.breeder as genetic_breeder
      FROM seed_batches sb
      JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id
      WHERE sb.is_active = 1
      ORDER BY sb.created_at DESC
    `);
    return stmt.all() as SeedBatch[];
  },

  // Buscar lote por ID
  findById(id: number): SeedBatch | undefined {
    const stmt = db.prepare(`
      SELECT sb.*, gs.name as genetic_name, gs.breeder as genetic_breeder
      FROM seed_batches sb
      JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id
      WHERE sb.id = ? AND sb.is_active = 1
    `);
    return stmt.get(id) as SeedBatch | undefined;
  },

  // Buscar lotes disponíveis (com sementes restantes)
  findAvailable(): SeedBatch[] {
    const stmt = db.prepare(`
      SELECT sb.*, gs.name as genetic_name, gs.breeder as genetic_breeder
      FROM seed_batches sb
      JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id
      WHERE sb.is_active = 1 AND sb.current_quantity > 0
      ORDER BY sb.created_at DESC
    `);
    return stmt.all() as SeedBatch[];
  },

  // Atualizar lote
  update(id: number, batch: Partial<SeedBatch>): boolean {
    const existing = this.findById(id);
    if (!existing) return false;

    const fields = [];
    const values = [];

    if (batch.batch_code !== undefined) { fields.push('batch_code = ?'); values.push(batch.batch_code); }
    if (batch.source !== undefined) { fields.push('source = ?'); values.push(batch.source); }
    if (batch.source_type !== undefined) { fields.push('source_type = ?'); values.push(batch.source_type); }
    if (batch.acquisition_date !== undefined) { fields.push('acquisition_date = ?'); values.push(batch.acquisition_date); }
    if (batch.initial_quantity !== undefined) { fields.push('initial_quantity = ?'); values.push(batch.initial_quantity); }
    if (batch.current_quantity !== undefined) { fields.push('current_quantity = ?'); values.push(batch.current_quantity); }
    if (batch.seed_type !== undefined) { fields.push('seed_type = ?'); values.push(batch.seed_type); }
    if (batch.generation !== undefined) { fields.push('generation = ?'); values.push(batch.generation); }
    if (batch.storage_location !== undefined) { fields.push('storage_location = ?'); values.push(batch.storage_location); }
    if (batch.storage_conditions !== undefined) { fields.push('storage_conditions = ?'); values.push(batch.storage_conditions); }
    if (batch.expiration_date !== undefined) { fields.push('expiration_date = ?'); values.push(batch.expiration_date); }
    if (batch.germination_rate !== undefined) { fields.push('germination_rate = ?'); values.push(batch.germination_rate); }
    if (batch.plants_generated !== undefined) { fields.push('plants_generated = ?'); values.push(batch.plants_generated); }
    if (batch.notes !== undefined) { fields.push('notes = ?'); values.push(batch.notes); }
    if (batch.is_active !== undefined) { fields.push('is_active = ?'); values.push(batch.is_active); }

    if (fields.length === 0) return true;

    fields.push('updated_at = datetime(\'now\', \'localtime\')');
    values.push(id);

    const stmt = db.prepare(`UPDATE seed_batches SET ${fields.join(', ')} WHERE id = ?`);
    const info = stmt.run(...values);
    return info.changes > 0;
  },

  // Decrementar quantidade de sementes
  decrementQuantity(id: number, quantity: number = 1): boolean {
    const stmt = db.prepare('UPDATE seed_batches SET current_quantity = current_quantity - ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ? AND current_quantity >= ?');
    const info = stmt.run(quantity, id, quantity);
    return info.changes > 0;
  },

  // Incrementar contador de plantas geradas
  incrementPlantsGenerated(id: number, count: number = 1): boolean {
    const stmt = db.prepare('UPDATE seed_batches SET plants_generated = plants_generated + ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?');
    const info = stmt.run(count, id);
    return info.changes > 0;
  },

  // Deletar lote (soft delete)
  delete(id: number): boolean {
    const stmt = db.prepare('UPDATE seed_batches SET is_active = 0, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }
};

export const RecipeModel = {
  // Criar nova receita
  create(recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>): Recipe {
    const stmt = db.prepare(`
      INSERT INTO recipes (name, process_type, ingredients, description)
      VALUES (?, ?, ?, ?)
    `);

    const info = stmt.run(
      recipe.name,
      recipe.process_type,
      JSON.stringify(recipe.ingredients),
      recipe.description || null
    );

    return { ...recipe, id: info.lastInsertRowid as number };
  },

  // Buscar todas as receitas
  findAll(processType?: string): Recipe[] {
    let query = 'SELECT * FROM recipes';
    let params: any[] = [];

    if (processType) {
      query += ' WHERE process_type = ?';
      params.push(processType);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      ...row,
      ingredients: JSON.parse(row.ingredients)
    }));
  },

  // Buscar receita por ID
  findById(id: number): Recipe | undefined {
    const stmt = db.prepare('SELECT * FROM recipes WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return undefined;

    return {
      ...row,
      ingredients: JSON.parse(row.ingredients)
    };
  },

  // Atualizar receita
  update(id: number, updates: Partial<Omit<Recipe, 'id' | 'created_at'>>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.process_type !== undefined) {
      fields.push('process_type = ?');
      values.push(updates.process_type);
    }
    if (updates.ingredients !== undefined) {
      fields.push('ingredients = ?');
      values.push(JSON.stringify(updates.ingredients));
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = datetime(\'now\', \'localtime\')');

    const query = `UPDATE recipes SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);

    const stmt = db.prepare(query);
    const info = stmt.run(...values);
    return info.changes > 0;
  },

  // Deletar receita
  delete(id: number): boolean {
    const stmt = db.prepare('DELETE FROM recipes WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }
};
