import express, { Request, Response } from 'express';
import { PlantModel, DailyRecordModel, StatisticsModel } from './models';
import { Plant, DailyRecord } from './types';

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

export default router;
