import express, { Request, Response } from 'express';
import { PlantModel, DailyRecordModel, StatisticsModel } from './models';
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

    const success = PlantModel.update(id, { photo_path: profile_photo });
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
    // Buscar dados do phase_history
    const phaseStats = db.prepare(`
      SELECT 
        phase,
        COUNT(*) as total_transitions,
        AVG(duration_days) as avg_days,
        MIN(duration_days) as min_days,
        MAX(duration_days) as max_days
      FROM phase_history 
      WHERE duration_days IS NOT NULL AND duration_days > 0
      GROUP BY phase
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

export default router;
