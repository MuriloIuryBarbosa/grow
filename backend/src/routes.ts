import express, { Request, Response } from 'express';
import { PlantModel, DailyRecordModel, StatisticsModel, GeneticStrainModel, SeedBatchModel } from './models';
import { Plant, DailyRecord } from './types';
import db from './database';

const router = express.Router();

// ===== ROTAS DE PLANTAS =====

// Listar todas as plantas
router.get('/plants', (req: Request, res: Response) => {
  try {
    const plants = PlantModel.findAll();
    res.json(plants);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar plantas' });
  }
});

// Buscar planta por ID ou código
router.get('/plants/:identifier', (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    let plant;

    // Tentar como ID primeiro
    if (!isNaN(Number(identifier))) {
      plant = PlantModel.findById(Number(identifier));
    }
    
    // Se não encontrou, tentar como código
    if (!plant) {
      plant = PlantModel.findByCode(identifier);
    }

    if (!plant) {
      return res.status(404).json({ error: 'Planta não encontrada' });
    }

    // Buscar registros diários da planta
    const plantWithDetails = PlantModel.findByIdWithDetails(plant.id!);
    
    if (!plantWithDetails) {
      return res.status(404).json({ error: 'Planta não encontrada' });
    }

    res.json(plantWithDetails);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar planta' });
  }
});

// Criar nova planta
router.post('/plants', (req: Request, res: Response) => {
  try {
    const plantData: Omit<Plant, 'id' | 'created_at'> = req.body;

    // Validações básicas - apenas name e code são obrigatórios
    if (!plantData.name || !plantData.code) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: name, code' 
      });
    }

    // Se não tiver planting_date, usar data atual
    if (!plantData.planting_date) {
      plantData.planting_date = new Date().toISOString().split('T')[0];
    }

    // Se não tiver substrate, usar padrão
    if (!plantData.substrate) {
      plantData.substrate = 'Não especificado';
    }

    // Verificar se o código já existe
    const existing = PlantModel.findByCode(plantData.code);
    if (existing) {
      return res.status(409).json({ error: 'Código já existe' });
    }

    const plant = PlantModel.create(plantData);
    res.status(201).json(plant);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao criar planta' });
  }
});

// Atualizar planta
router.put('/plants/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updates: Partial<Plant> = req.body;

    const success = PlantModel.update(id, updates);
    if (!success) {
      return res.status(404).json({ error: 'Planta não encontrada' });
    }

    const updated = PlantModel.findById(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar planta' });
  }
});

// Atualizar foto de perfil da planta
router.patch('/plants/:id/profile-photo', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { profile_photo } = req.body;

    const success = PlantModel.update(id, { profile_photo: profile_photo });
    if (!success) {
      return res.status(404).json({ error: 'Planta não encontrada' });
    }

    const updated = PlantModel.findById(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar foto de perfil' });
  }
});

// Marcar planta como morta/falha
router.patch('/plants/:id/status', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, failure_date, failure_reason } = req.body;

    if (!status || !['ativa', 'morta', 'falha_germinacao'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const updates: Partial<Plant> = { status };
    if (status !== 'ativa') {
      updates.failure_date = failure_date || new Date().toISOString().split('T')[0];
      updates.failure_reason = failure_reason;
    } else {
      updates.failure_date = undefined;
      updates.failure_reason = undefined;
    }

    const success = PlantModel.update(id, updates);
    if (!success) {
      return res.status(404).json({ error: 'Planta não encontrada' });
    }

    const updated = PlantModel.findById(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao atualizar status' });
  }
});

// Atualizar fase da planta
router.put('/plants/:id/phase', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { phase } = req.body;

    const validPhases = ['germinacao', 'muda', 'vegetacao', 'floracao'];
    if (!validPhases.includes(phase)) {
      return res.status(400).json({ error: 'Fase inválida. Use: germinacao, muda, vegetacao ou floracao' });
    }

    const plant = PlantModel.findById(id);
    if (!plant) {
      return res.status(404).json({ error: 'Planta não encontrada' });
    }

    const success = PlantModel.update(id, { current_phase: phase });
    if (!success) {
      return res.status(500).json({ error: 'Erro ao atualizar fase' });
    }

    const updated = PlantModel.findById(id);
    res.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar fase:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar fase' });
  }
});

// Deletar planta
router.delete('/plants/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const success = PlantModel.delete(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Planta não encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar planta' });
  }
});

// Buscar plantas por fase
router.get('/plants/phase/:phase', (req: Request, res: Response) => {
  try {
    const { phase } = req.params;
    const validPhases = ['germinacao', 'muda', 'vegetacao', 'floracao'];
    
    if (!validPhases.includes(phase)) {
      return res.status(400).json({ error: 'Fase inválida' });
    }

    const plants = PlantModel.findByPhase(phase);
    res.json(plants);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar plantas por fase' });
  }
});

// Estatísticas de evolução de fases
router.get('/statistics/phases', (req: Request, res: Response) => {
  try {
    // Buscar dados do phase_history (excluindo plantas mortas)
    const phaseStats = db.prepare(`
      SELECT 
        ph.phase,
        COUNT(*) as total_transitions,
        AVG(ph.duration_days) as avg_days,
        MIN(ph.duration_days) as min_days,
        MAX(ph.duration_days) as max_days
      FROM phase_history ph
      INNER JOIN plants p ON ph.plant_id = p.id
      WHERE ph.duration_days IS NOT NULL 
        AND ph.duration_days > 0
        AND p.status NOT IN ('morta', 'falha_germinacao')
      GROUP BY ph.phase
    `).all() as Array<{
      phase: string;
      total_transitions: number;
      avg_days: number | null;
      min_days: number | null;
      max_days: number | null;
    }>;

    // Estruturar resposta com todas as fases
    const phases = ['germinacao', 'muda', 'vegetacao', 'floracao'];
    const result = phases.map(phase => {
      const stat = phaseStats.find(s => s.phase === phase);
      return {
        phase,
        total_transitions: stat?.total_transitions || 0,
        avg_days: stat?.avg_days ? Math.round(stat.avg_days * 10) / 10 : null,
        min_days: stat?.min_days || null,
        max_days: stat?.max_days || null,
      };
    });

    res.json(result);
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas de fases:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar estatísticas de fases' });
  }
});

// Métricas de genéticas - Motor de cálculo de qualidade
router.get('/statistics/genetics', (req: Request, res: Response) => {
  try {
    // Buscar todas as genéticas com métricas calculadas
    const geneticMetrics = db.prepare(`
      SELECT 
        gs.id,
        gs.name,
        gs.breeder,
        gs.type,
        gs.difficulty,
        gs.flowering_time_min,
        gs.flowering_time_max,
        -- Contadores de plantas
        COUNT(p.id) as total_plants,
        SUM(CASE WHEN p.status = 'ativa' THEN 1 ELSE 0 END) as active_plants,
        SUM(CASE WHEN p.status = 'morta' THEN 1 ELSE 0 END) as dead_plants,
        SUM(CASE WHEN p.status = 'falha_germinacao' THEN 1 ELSE 0 END) as germination_failures,
        -- Taxa de sucesso (plantas que não morreram / total)
        CASE 
          WHEN COUNT(p.id) > 0 
          THEN ROUND(CAST(SUM(CASE WHEN p.status = 'ativa' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(p.id) * 100, 1)
          ELSE NULL 
        END as success_rate,
        -- Taxa de germinação (plantas que passaram da germinação / total)
        CASE 
          WHEN COUNT(p.id) > 0 
          THEN ROUND(CAST(SUM(CASE WHEN p.status != 'falha_germinacao' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(p.id) * 100, 1)
          ELSE NULL 
        END as germination_rate
      FROM genetic_strains gs
      LEFT JOIN plants p ON p.genetic_id = gs.id
      WHERE gs.is_active = 1
      GROUP BY gs.id
      ORDER BY 
        CASE WHEN COUNT(p.id) > 0 THEN 0 ELSE 1 END,
        success_rate DESC NULLS LAST,
        total_plants DESC
    `).all();

    // Para cada genética, buscar métricas de evolução
    const geneticsWithEvolution = (geneticMetrics as any[]).map(genetic => {
      // Buscar dados de evolução das plantas dessa genética
      const evolutionData = db.prepare(`
        SELECT 
          AVG(ph.duration_days) as avg_phase_duration,
          MIN(ph.duration_days) as min_phase_duration,
          MAX(ph.duration_days) as max_phase_duration,
          COUNT(DISTINCT p.id) as plants_with_history
        FROM phase_history ph
        JOIN plants p ON ph.plant_id = p.id
        WHERE p.genetic_id = ?
          AND ph.duration_days IS NOT NULL 
          AND ph.duration_days > 0
      `).get(genetic.id) as any;

      // Buscar maior altura registrada
      const sizeData = db.prepare(`
        SELECT 
          MAX(dr.plant_size) as max_height,
          AVG(dr.plant_size) as avg_height
        FROM daily_records dr
        JOIN plants p ON dr.plant_id = p.id
        WHERE p.genetic_id = ?
          AND dr.plant_size IS NOT NULL
      `).get(genetic.id) as any;

      // Calcular score de qualidade (0-100)
      let qualityScore = 0;
      let scoreFactors = 0;

      // Fator 1: Taxa de sucesso (peso 40%)
      if (genetic.success_rate !== null) {
        qualityScore += genetic.success_rate * 0.4;
        scoreFactors++;
      }

      // Fator 2: Taxa de germinação (peso 30%)
      if (genetic.germination_rate !== null) {
        qualityScore += genetic.germination_rate * 0.3;
        scoreFactors++;
      }

      // Fator 3: Consistência de evolução - menor variação é melhor (peso 15%)
      if (evolutionData?.avg_phase_duration && evolutionData?.max_phase_duration) {
        const variance = evolutionData.max_phase_duration - (evolutionData.min_phase_duration || 0);
        const consistencyScore = Math.max(0, 100 - (variance * 2));
        qualityScore += consistencyScore * 0.15;
        scoreFactors++;
      }

      // Fator 4: Volume de dados - mais dados = mais confiável (peso 15%)
      if (genetic.total_plants > 0) {
        const dataScore = Math.min(100, genetic.total_plants * 20);
        qualityScore += dataScore * 0.15;
        scoreFactors++;
      }

      return {
        ...genetic,
        evolution: {
          avg_phase_duration: evolutionData?.avg_phase_duration ? Math.round(evolutionData.avg_phase_duration * 10) / 10 : null,
          min_phase_duration: evolutionData?.min_phase_duration || null,
          max_phase_duration: evolutionData?.max_phase_duration || null,
          plants_with_history: evolutionData?.plants_with_history || 0,
        },
        growth: {
          max_height: sizeData?.max_height || null,
          avg_height: sizeData?.avg_height ? Math.round(sizeData.avg_height * 10) / 10 : null,
        },
        quality_score: scoreFactors > 0 ? Math.round(qualityScore) : null,
      };
    });

    res.json(geneticsWithEvolution);
  } catch (error: any) {
    console.error('Erro ao buscar métricas genéticas:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar métricas genéticas' });
  }
});

// Métricas de uma genética específica
router.get('/statistics/genetics/:id', (req: Request, res: Response) => {
  try {
    const geneticId = Number(req.params.id);

    // Buscar genética
    const genetic = db.prepare(`
      SELECT * FROM genetic_strains WHERE id = ?
    `).get(geneticId);

    if (!genetic) {
      return res.status(404).json({ error: 'Genética não encontrada' });
    }

    // Buscar todas as plantas dessa genética
    const plants = db.prepare(`
      SELECT 
        id, name, code, status, current_phase, 
        planting_date, failure_date, failure_reason
      FROM plants 
      WHERE genetic_id = ?
      ORDER BY 
        CASE status WHEN 'ativa' THEN 0 ELSE 1 END,
        planting_date DESC
    `).all(geneticId);

    // Estatísticas por fase
    const phaseStats = db.prepare(`
      SELECT 
        ph.phase,
        COUNT(*) as count,
        AVG(ph.duration_days) as avg_days,
        MIN(ph.duration_days) as min_days,
        MAX(ph.duration_days) as max_days
      FROM phase_history ph
      JOIN plants p ON ph.plant_id = p.id
      WHERE p.genetic_id = ?
        AND ph.duration_days IS NOT NULL
      GROUP BY ph.phase
    `).all(geneticId);

    // Timeline de eventos
    const timeline = db.prepare(`
      SELECT 
        'plant_created' as event_type,
        p.name as description,
        p.planting_date as event_date
      FROM plants p
      WHERE p.genetic_id = ?
      UNION ALL
      SELECT 
        'plant_died' as event_type,
        p.name || ': ' || COALESCE(p.failure_reason, 'Sem causa registrada') as description,
        p.failure_date as event_date
      FROM plants p
      WHERE p.genetic_id = ? AND p.status IN ('morta', 'falha_germinacao')
      ORDER BY event_date DESC
      LIMIT 20
    `).all(geneticId, geneticId);

    res.json({
      genetic,
      plants,
      phaseStats,
      timeline,
      summary: {
        total_plants: plants.length,
        active_plants: (plants as any[]).filter(p => p.status === 'ativa').length,
        dead_plants: (plants as any[]).filter(p => p.status === 'morta').length,
        germination_failures: (plants as any[]).filter(p => p.status === 'falha_germinacao').length,
      }
    });
  } catch (error: any) {
    console.error('Erro ao buscar métricas da genética:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar métricas da genética' });
  }
});

// ===== ROTAS DE REGISTROS DIÁRIOS =====

// Listar todos os registros
router.get('/records', (req: Request, res: Response) => {
  try {
    const records = DailyRecordModel.findAll();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar registros' });
  }
});

// Buscar registros de uma planta
router.get('/records/plant/:plantId', (req: Request, res: Response) => {
  try {
    const plantId = Number(req.params.plantId);
    const records = DailyRecordModel.findByPlantId(plantId);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar registros da planta' });
  }
});

// Buscar registro específico por ID
router.get('/records/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const record = DailyRecordModel.findById(id);
    
    if (!record) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }
    
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar registro' });
  }
});

// Criar registro diário
router.post('/records', (req: Request, res: Response) => {
  try {
    const recordData: Omit<DailyRecord, 'id' | 'created_at'> = req.body;

    // Validações
    if (!recordData.plant_id || !recordData.record_date) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: plant_id, record_date' 
      });
    }

    // Verificar se a planta existe
    const plant = PlantModel.findById(recordData.plant_id);
    if (!plant) {
      return res.status(404).json({ error: 'Planta não encontrada' });
    }

    const record = DailyRecordModel.create(recordData);
    res.status(201).json(record);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao criar registro' });
  }
});

// Atualizar registro
router.put('/records/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updates: Partial<DailyRecord> = req.body;

    const success = DailyRecordModel.update(id, updates);
    if (!success) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }

    const updated = DailyRecordModel.findById(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar registro' });
  }
});

// Deletar registro
router.delete('/records/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const success = DailyRecordModel.delete(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar registro' });
  }
});

// ===== ROTAS DE ESTATÍSTICAS =====

// Obter visão geral das estatísticas
router.get('/statistics/overview', (req: Request, res: Response) => {
  try {
    const stats = StatisticsModel.getOverview();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Obter estatísticas de uma planta
router.get('/statistics/plant/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const stats = StatisticsModel.getPlantStats(id);
    
    if (!stats) {
      return res.status(404).json({ error: 'Planta não encontrada ou sem registros' });
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas da planta' });
  }
});

// ===== ROTAS DE SENSORES =====

// Listar todos os sensores
router.get('/sensors', (req: Request, res: Response) => {
  try {
    const sensors = db.prepare('SELECT * FROM sensors ORDER BY is_active DESC, name ASC').all();
    res.json(sensors);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar sensores' });
  }
});

// Buscar sensor por ID
router.get('/sensors/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const sensor = db.prepare('SELECT * FROM sensors WHERE id = ?').get(id);
    
    if (!sensor) {
      return res.status(404).json({ error: 'Sensor não encontrado' });
    }

    res.json(sensor);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar sensor' });
  }
});

// Criar novo sensor
router.post('/sensors', (req: Request, res: Response) => {
  try {
    const { name, type, location, description, is_active } = req.body;

    if (!name || !type || !location) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: name, type, location' 
      });
    }

    const validTypes = ['temperature', 'humidity', 'temperature_humidity'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Tipo inválido. Use: temperature, humidity ou temperature_humidity' 
      });
    }

    const result = db.prepare(`
      INSERT INTO sensors (name, type, location, description, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, type, location, description || null, is_active !== undefined ? is_active : 1);

    const sensor = db.prepare('SELECT * FROM sensors WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(sensor);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao criar sensor' });
  }
});

// Atualizar sensor
router.put('/sensors/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, type, location, description, is_active } = req.body;

    const existing = db.prepare('SELECT * FROM sensors WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Sensor não encontrado' });
    }

    db.prepare(`
      UPDATE sensors 
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          location = COALESCE(?, location),
          description = COALESCE(?, description),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(name, type, location, description, is_active, id);

    const updated = db.prepare('SELECT * FROM sensors WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar sensor' });
  }
});

// Deletar sensor
router.delete('/sensors/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = db.prepare('DELETE FROM sensors WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Sensor não encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar sensor' });
  }
});

// ===== ROTAS DE LEITURAS DE SENSORES =====

// Listar leituras de um sensor
router.get('/sensors/:id/readings', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { limit = 100, offset = 0 } = req.query;

    const readings = db.prepare(`
      SELECT sr.*, s.name as sensor_name, s.location
      FROM sensor_readings sr
      JOIN sensors s ON sr.sensor_id = s.id
      WHERE sr.sensor_id = ?
      ORDER BY sr.recorded_at DESC
      LIMIT ? OFFSET ?
    `).all(id, Number(limit), Number(offset));

    res.json(readings);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar leituras' });
  }
});

// Criar nova leitura
router.post('/sensor-readings', (req: Request, res: Response) => {
  try {
    const { sensor_id, temperature, humidity, recorded_at, notes } = req.body;

    if (!sensor_id) {
      return res.status(400).json({ error: 'Campo obrigatório: sensor_id' });
    }

    if (temperature === undefined && humidity === undefined) {
      return res.status(400).json({ 
        error: 'Pelo menos um campo deve ser fornecido: temperature ou humidity' 
      });
    }

    // Verificar se sensor existe
    const sensor = db.prepare('SELECT * FROM sensors WHERE id = ?').get(sensor_id);
    if (!sensor) {
      return res.status(404).json({ error: 'Sensor não encontrado' });
    }

    const timestamp = recorded_at || new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO sensor_readings (sensor_id, temperature, humidity, recorded_at, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(sensor_id, temperature || null, humidity || null, timestamp, notes || null);

    const reading = db.prepare(`
      SELECT sr.*, s.name as sensor_name, s.location
      FROM sensor_readings sr
      JOIN sensors s ON sr.sensor_id = s.id
      WHERE sr.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(reading);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao criar leitura' });
  }
});

// Obter médias diárias de todos os sensores
router.get('/sensor-readings/daily-averages', (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;

    const averages = db.prepare(`
      SELECT 
        s.id as sensor_id,
        s.name as sensor_name,
        s.location,
        DATE(sr.recorded_at) as date,
        AVG(sr.temperature) as avg_temperature,
        AVG(sr.humidity) as avg_humidity,
        MIN(sr.temperature) as min_temperature,
        MAX(sr.temperature) as max_temperature,
        MIN(sr.humidity) as min_humidity,
        MAX(sr.humidity) as max_humidity,
        COUNT(*) as reading_count
      FROM sensor_readings sr
      JOIN sensors s ON sr.sensor_id = s.id
      WHERE DATE(sr.recorded_at) >= DATE('now', '-' || ? || ' days')
      GROUP BY s.id, DATE(sr.recorded_at)
      ORDER BY DATE(sr.recorded_at) DESC, s.name ASC
    `).all(Number(days));

    res.json(averages);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar médias diárias' });
  }
});

// Obter últimas leituras de todos os sensores
router.get('/sensor-readings/latest', (req: Request, res: Response) => {
  try {
    const latest = db.prepare(`
      SELECT 
        s.id as sensor_id,
        s.name as sensor_name,
        s.location,
        sr.temperature,
        sr.humidity,
        sr.recorded_at,
        sr.notes
      FROM sensors s
      LEFT JOIN sensor_readings sr ON s.id = sr.sensor_id
      WHERE sr.id IN (
        SELECT MAX(id)
        FROM sensor_readings
        WHERE sensor_id = s.id
      )
      OR sr.id IS NULL
      ORDER BY s.name ASC
    `).all();

    res.json(latest);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar últimas leituras' });
  }
});

// ============================================
// ROTAS DO BANCO GENÉTICO
// ============================================

// ===== GENETIC STRAINS =====

// Listar todas as genéticas ativas
router.get('/genetic-strains', (req: Request, res: Response) => {
  try {
    const strains = GeneticStrainModel.findAll();
    res.json(strains);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar genéticas' });
  }
});

// Buscar genética por ID
router.get('/genetic-strains/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const strain = GeneticStrainModel.findById(Number(id));
    
    if (!strain) {
      return res.status(404).json({ error: 'Genética não encontrada' });
    }
    
    res.json(strain);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar genética' });
  }
});

// Criar nova genética
router.post('/genetic-strains', (req: Request, res: Response) => {
  try {
    const strainData = req.body;
    const strain = GeneticStrainModel.create(strainData);
    res.status(201).json(strain);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Já existe uma genética com este nome' });
    } else {
      res.status(500).json({ error: 'Erro ao criar genética' });
    }
  }
});

// Atualizar genética
router.put('/genetic-strains/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const strainData = req.body;
    
    const success = GeneticStrainModel.update(Number(id), strainData);
    if (!success) {
      return res.status(404).json({ error: 'Genética não encontrada' });
    }
    
    const updated = GeneticStrainModel.findById(Number(id));
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Já existe uma genética com este nome' });
    } else {
      res.status(500).json({ error: 'Erro ao atualizar genética' });
    }
  }
});

// Deletar genética
router.delete('/genetic-strains/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = GeneticStrainModel.delete(Number(id));
    
    if (!success) {
      return res.status(404).json({ error: 'Genética não encontrada' });
    }
    
    res.json({ message: 'Genética removida com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar genética' });
  }
});

// ===== SEED BATCHES =====

// ===== GERMINAÇÃO EM LOTE =====

// Germinar sementes em lote
router.post('/seed-batches/:id/germinate', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, substrate, substrate_other, location, notes } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantidade deve ser maior que 0' });
    }
    
    // Verificar se o lote existe e tem sementes suficientes
    const batch = SeedBatchModel.findById(Number(id));
    if (!batch) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }
    
    if ((batch.current_quantity || 0) < quantity) {
      return res.status(400).json({ error: `Lote tem apenas ${batch.current_quantity || 0} sementes disponíveis` });
    }
    
    const createdPlants = [];
    const plantingDate = new Date().toISOString().split('T')[0];
    
    // Criar plantas em lote
    for (let i = 0; i < quantity; i++) {
      const code = PlantModel.generateNextCode();
      const plantData = {
        name: `${batch.genetic_name} #${i + 1}`,
        genetic: batch.genetic_name,
        code: code,
        planting_date: plantingDate,
        substrate: substrate || 'Terra vegetal',
        substrate_other: substrate_other || null,
        current_phase: 'germinacao' as const,
        current_location: location || null,
        status: 'ativa' as const,
        seed_batch_id: batch.id,
        origin_type: 'seed' as const,
      };
      
      const plant = PlantModel.create(plantData);
      createdPlants.push(plant);
    }
    
    // Decrementar quantidade de sementes no lote
    SeedBatchModel.decrementQuantity(Number(id), quantity);
    
    // Incrementar contador de plantas geradas
    SeedBatchModel.incrementPlantsGenerated(Number(id), quantity);
    
    res.json({
      message: `${quantity} plantas criadas com sucesso`,
      plants: createdPlants,
      batch_code: batch.batch_code
    });
  } catch (error) {
    console.error('Erro ao germinar sementes:', error);
    res.status(500).json({ error: 'Erro ao germinar sementes' });
  }
});

export default router;
