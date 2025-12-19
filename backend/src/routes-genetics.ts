import express, { Request, Response } from 'express';
import db from './database';

const router = express.Router();

// ===== GENETIC STRAINS (Genéticas) =====

// Listar todas as genéticas
router.get('/genetics', (req: Request, res: Response) => {
  try {
    const { active_only } = req.query;
    
    let query = `
      SELECT 
        gs.*,
        (SELECT COUNT(*) FROM seed_batches WHERE genetic_strain_id = gs.id AND is_active = 1) as active_batches,
        (SELECT COALESCE(SUM(current_quantity), 0) FROM seed_batches WHERE genetic_strain_id = gs.id AND is_active = 1) as total_seeds,
        (SELECT COUNT(*) FROM plants p 
         INNER JOIN seed_batches sb ON p.seed_batch_id = sb.id 
         WHERE sb.genetic_strain_id = gs.id) as total_plants
      FROM genetic_strains gs
    `;
    
    if (active_only === 'true') {
      query += ' WHERE gs.is_active = 1';
    }
    
    query += ' ORDER BY gs.name ASC';
    
    const genetics = db.prepare(query).all();
    res.json(genetics);
  } catch (error) {
    console.error('Erro ao buscar genéticas:', error);
    res.status(500).json({ error: 'Erro ao buscar genéticas' });
  }
});

// Buscar genética por ID
router.get('/genetics/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    const genetic = db.prepare(`
      SELECT 
        gs.*,
        (SELECT COUNT(*) FROM seed_batches WHERE genetic_strain_id = gs.id AND is_active = 1) as active_batches,
        (SELECT COALESCE(SUM(current_quantity), 0) FROM seed_batches WHERE genetic_strain_id = gs.id AND is_active = 1) as total_seeds,
        (SELECT COUNT(*) FROM plants p 
         INNER JOIN seed_batches sb ON p.seed_batch_id = sb.id 
         WHERE sb.genetic_strain_id = gs.id) as total_plants
      FROM genetic_strains gs
      WHERE gs.id = ?
    `).get(id);
    
    if (!genetic) {
      return res.status(404).json({ error: 'Genética não encontrada' });
    }
    
    res.json(genetic);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar genética' });
  }
});

// Criar nova genética
router.post('/genetics', (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    if (!data.name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    // Verificar se já existe
    const existing = db.prepare('SELECT id FROM genetic_strains WHERE name = ?').get(data.name);
    if (existing) {
      return res.status(409).json({ error: 'Já existe uma genética com este nome' });
    }
    
    const result = db.prepare(`
      INSERT INTO genetic_strains (
        name, breeder, type, indica_percentage, sativa_percentage,
        flowering_time_min, flowering_time_max, height_indoor, height_outdoor,
        yield_indoor, yield_outdoor, difficulty, thc_percentage, cbd_percentage,
        flavors, effects, description, grow_notes, photo_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name, data.breeder, data.type, data.indica_percentage, data.sativa_percentage,
      data.flowering_time_min, data.flowering_time_max, data.height_indoor, data.height_outdoor,
      data.yield_indoor, data.yield_outdoor, data.difficulty, data.thc_percentage, data.cbd_percentage,
      data.flavors, data.effects, data.description, data.grow_notes, data.photo_path
    );
    
    const created = db.prepare('SELECT * FROM genetic_strains WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Erro ao criar genética:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar genética' });
  }
});

// Atualizar genética
router.put('/genetics/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = req.body;
    
    const existing = db.prepare('SELECT id FROM genetic_strains WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Genética não encontrada' });
    }
    
    db.prepare(`
      UPDATE genetic_strains SET
        name = COALESCE(?, name),
        breeder = ?,
        type = ?,
        indica_percentage = ?,
        sativa_percentage = ?,
        flowering_time_min = ?,
        flowering_time_max = ?,
        height_indoor = ?,
        height_outdoor = ?,
        yield_indoor = ?,
        yield_outdoor = ?,
        difficulty = ?,
        thc_percentage = ?,
        cbd_percentage = ?,
        flavors = ?,
        effects = ?,
        description = ?,
        grow_notes = ?,
        photo_path = ?,
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      data.name, data.breeder, data.type, data.indica_percentage, data.sativa_percentage,
      data.flowering_time_min, data.flowering_time_max, data.height_indoor, data.height_outdoor,
      data.yield_indoor, data.yield_outdoor, data.difficulty, data.thc_percentage, data.cbd_percentage,
      data.flavors, data.effects, data.description, data.grow_notes, data.photo_path, data.is_active, id
    );
    
    const updated = db.prepare('SELECT * FROM genetic_strains WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar genética' });
  }
});

// Deletar genética (soft delete)
router.delete('/genetics/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    // Verificar se tem lotes associados
    const batches = db.prepare('SELECT COUNT(*) as count FROM seed_batches WHERE genetic_strain_id = ?').get(id) as any;
    if (batches.count > 0) {
      // Soft delete
      db.prepare('UPDATE genetic_strains SET is_active = 0 WHERE id = ?').run(id);
      return res.json({ message: 'Genética desativada (possui lotes associados)' });
    }
    
    // Hard delete se não tem associações
    db.prepare('DELETE FROM genetic_strains WHERE id = ?').run(id);
    res.json({ message: 'Genética removida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover genética' });
  }
});

// ===== SEED BATCHES (Lotes de Sementes) =====

// Listar todos os lotes
router.get('/seed-batches', (req: Request, res: Response) => {
  try {
    const { genetic_id, active_only, available_only } = req.query;
    
    let query = `
      SELECT 
        sb.*,
        gs.name as genetic_name,
        gs.breeder,
        gs.type as genetic_type,
        gs.flowering_time_min,
        gs.flowering_time_max
      FROM seed_batches sb
      LEFT JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (genetic_id) {
      query += ' AND sb.genetic_strain_id = ?';
      params.push(Number(genetic_id));
    }
    
    if (active_only === 'true') {
      query += ' AND sb.is_active = 1';
    }
    
    if (available_only === 'true') {
      query += ' AND sb.current_quantity > 0';
    }
    
    query += ' ORDER BY gs.name ASC, sb.acquisition_date DESC';
    
    const batches = db.prepare(query).all(...params);
    res.json(batches);
  } catch (error) {
    console.error('Erro ao buscar lotes:', error);
    res.status(500).json({ error: 'Erro ao buscar lotes de sementes' });
  }
});

// Buscar lote por ID
router.get('/seed-batches/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    const batch = db.prepare(`
      SELECT 
        sb.*,
        gs.name as genetic_name,
        gs.breeder,
        gs.type as genetic_type,
        gs.flowering_time_min,
        gs.flowering_time_max
      FROM seed_batches sb
      LEFT JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id
      WHERE sb.id = ?
    `).get(id);
    
    if (!batch) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }
    
    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar lote' });
  }
});

// Criar novo lote
router.post('/seed-batches', (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    if (!data.genetic_strain_id || !data.batch_code || !data.source || !data.acquisition_date || !data.initial_quantity) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: genetic_strain_id, batch_code, source, acquisition_date, initial_quantity' 
      });
    }
    
    // Verificar se código já existe
    const existing = db.prepare('SELECT id FROM seed_batches WHERE batch_code = ?').get(data.batch_code);
    if (existing) {
      return res.status(409).json({ error: 'Já existe um lote com este código' });
    }
    
    // Se current_quantity não foi informado, usar initial_quantity
    if (data.current_quantity === undefined) {
      data.current_quantity = data.initial_quantity;
    }
    
    const result = db.prepare(`
      INSERT INTO seed_batches (
        genetic_strain_id, batch_code, source, source_type, acquisition_date,
        initial_quantity, current_quantity, seed_type, generation,
        storage_location, storage_conditions, expiration_date, germination_rate, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.genetic_strain_id, data.batch_code, data.source, data.source_type, data.acquisition_date,
      data.initial_quantity, data.current_quantity, data.seed_type, data.generation,
      data.storage_location, data.storage_conditions, data.expiration_date, data.germination_rate, data.notes
    );
    
    const created = db.prepare(`
      SELECT sb.*, gs.name as genetic_name 
      FROM seed_batches sb 
      LEFT JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id 
      WHERE sb.id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Erro ao criar lote:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar lote' });
  }
});

// Atualizar lote
router.put('/seed-batches/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = req.body;
    
    const existing = db.prepare('SELECT id FROM seed_batches WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }
    
    db.prepare(`
      UPDATE seed_batches SET
        genetic_strain_id = COALESCE(?, genetic_strain_id),
        batch_code = COALESCE(?, batch_code),
        source = COALESCE(?, source),
        source_type = ?,
        acquisition_date = COALESCE(?, acquisition_date),
        initial_quantity = COALESCE(?, initial_quantity),
        current_quantity = COALESCE(?, current_quantity),
        seed_type = ?,
        generation = ?,
        storage_location = ?,
        storage_conditions = ?,
        expiration_date = ?,
        germination_rate = ?,
        notes = ?,
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      data.genetic_strain_id, data.batch_code, data.source, data.source_type, data.acquisition_date,
      data.initial_quantity, data.current_quantity, data.seed_type, data.generation,
      data.storage_location, data.storage_conditions, data.expiration_date, data.germination_rate, 
      data.notes, data.is_active, id
    );
    
    const updated = db.prepare(`
      SELECT sb.*, gs.name as genetic_name 
      FROM seed_batches sb 
      LEFT JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id 
      WHERE sb.id = ?
    `).get(id);
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar lote' });
  }
});

// Atualizar quantidade de sementes
router.patch('/seed-batches/:id/quantity', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { quantity, operation } = req.body; // operation: 'set', 'add', 'subtract'
    
    const batch = db.prepare('SELECT current_quantity FROM seed_batches WHERE id = ?').get(id) as any;
    if (!batch) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }
    
    let newQuantity = batch.current_quantity;
    
    switch (operation) {
      case 'set':
        newQuantity = quantity;
        break;
      case 'add':
        newQuantity = batch.current_quantity + quantity;
        break;
      case 'subtract':
        newQuantity = Math.max(0, batch.current_quantity - quantity);
        break;
      default:
        return res.status(400).json({ error: 'Operação inválida. Use: set, add ou subtract' });
    }
    
    db.prepare('UPDATE seed_batches SET current_quantity = ? WHERE id = ?').run(newQuantity, id);
    
    res.json({ id, current_quantity: newQuantity });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar quantidade' });
  }
});

// Deletar lote
router.delete('/seed-batches/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    // Verificar se tem plantas associadas
    const plants = db.prepare('SELECT COUNT(*) as count FROM plants WHERE seed_batch_id = ?').get(id) as any;
    if (plants.count > 0) {
      // Soft delete
      db.prepare('UPDATE seed_batches SET is_active = 0 WHERE id = ?').run(id);
      return res.json({ message: 'Lote desativado (possui plantas associadas)' });
    }
    
    db.prepare('DELETE FROM seed_batches WHERE id = ?').run(id);
    res.json({ message: 'Lote removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover lote' });
  }
});

// ===== CLONES =====

// Listar todos os clones
router.get('/clones', (req: Request, res: Response) => {
  try {
    const { mother_id, status } = req.query;
    
    let query = `
      SELECT 
        c.*,
        mp.name as mother_plant_name,
        mp.code as mother_plant_code,
        mp.genetic as mother_genetic,
        dp.name as destination_plant_name,
        dp.code as destination_plant_code
      FROM clones c
      LEFT JOIN plants mp ON c.mother_plant_id = mp.id
      LEFT JOIN plants dp ON c.destination_plant_id = dp.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (mother_id) {
      query += ' AND c.mother_plant_id = ?';
      params.push(Number(mother_id));
    }
    
    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY c.cut_date DESC';
    
    const clones = db.prepare(query).all(...params);
    res.json(clones);
  } catch (error) {
    console.error('Erro ao buscar clones:', error);
    res.status(500).json({ error: 'Erro ao buscar clones' });
  }
});

// Buscar clone por ID
router.get('/clones/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    const clone = db.prepare(`
      SELECT 
        c.*,
        mp.name as mother_plant_name,
        mp.code as mother_plant_code,
        mp.genetic as mother_genetic,
        dp.name as destination_plant_name,
        dp.code as destination_plant_code
      FROM clones c
      LEFT JOIN plants mp ON c.mother_plant_id = mp.id
      LEFT JOIN plants dp ON c.destination_plant_id = dp.id
      WHERE c.id = ?
    `).get(id);
    
    if (!clone) {
      return res.status(404).json({ error: 'Clone não encontrado' });
    }
    
    res.json(clone);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar clone' });
  }
});

// Criar novo clone
router.post('/clones', (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    if (!data.mother_plant_id || !data.clone_code || !data.cut_date) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: mother_plant_id, clone_code, cut_date' 
      });
    }
    
    // Verificar se código já existe
    const existing = db.prepare('SELECT id FROM clones WHERE clone_code = ?').get(data.clone_code);
    if (existing) {
      return res.status(409).json({ error: 'Já existe um clone com este código' });
    }
    
    // Verificar se planta mãe existe
    const mother = db.prepare('SELECT id FROM plants WHERE id = ?').get(data.mother_plant_id);
    if (!mother) {
      return res.status(404).json({ error: 'Planta mãe não encontrada' });
    }
    
    const result = db.prepare(`
      INSERT INTO clones (
        mother_plant_id, clone_code, cut_date, rooting_date,
        status, rooting_method, rooting_medium, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.mother_plant_id, data.clone_code, data.cut_date, data.rooting_date,
      data.status || 'rooting', data.rooting_method, data.rooting_medium, data.notes
    );
    
    const created = db.prepare(`
      SELECT c.*, mp.name as mother_plant_name, mp.code as mother_plant_code, mp.genetic as mother_genetic
      FROM clones c
      LEFT JOIN plants mp ON c.mother_plant_id = mp.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Erro ao criar clone:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar clone' });
  }
});

// Atualizar clone
router.put('/clones/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = req.body;
    
    const existing = db.prepare('SELECT id FROM clones WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Clone não encontrado' });
    }
    
    db.prepare(`
      UPDATE clones SET
        clone_code = COALESCE(?, clone_code),
        cut_date = COALESCE(?, cut_date),
        rooting_date = ?,
        status = COALESCE(?, status),
        destination_plant_id = ?,
        rooting_method = ?,
        rooting_medium = ?,
        notes = ?
      WHERE id = ?
    `).run(
      data.clone_code, data.cut_date, data.rooting_date,
      data.status, data.destination_plant_id, data.rooting_method, 
      data.rooting_medium, data.notes, id
    );
    
    const updated = db.prepare(`
      SELECT c.*, mp.name as mother_plant_name, mp.code as mother_plant_code
      FROM clones c
      LEFT JOIN plants mp ON c.mother_plant_id = mp.id
      WHERE c.id = ?
    `).get(id);
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar clone' });
  }
});

// Atualizar status do clone
router.patch('/clones/:id/status', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, rooting_date } = req.body;
    
    const clone = db.prepare('SELECT * FROM clones WHERE id = ?').get(id) as any;
    if (!clone) {
      return res.status(404).json({ error: 'Clone não encontrado' });
    }
    
    const updates: any = { status };
    
    // Se está marcando como enraizado, registrar a data
    if (status === 'rooted' && !clone.rooting_date) {
      updates.rooting_date = rooting_date || new Date().toISOString().split('T')[0];
    }
    
    db.prepare(`
      UPDATE clones SET status = ?, rooting_date = COALESCE(?, rooting_date) WHERE id = ?
    `).run(status, updates.rooting_date, id);
    
    const updated = db.prepare('SELECT * FROM clones WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// Deletar clone
router.delete('/clones/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    // Verificar se tem planta associada
    const clone = db.prepare('SELECT destination_plant_id FROM clones WHERE id = ?').get(id) as any;
    if (clone?.destination_plant_id) {
      return res.status(400).json({ 
        error: 'Clone possui planta associada. Remova a planta primeiro ou desassocie o clone.' 
      });
    }
    
    db.prepare('DELETE FROM clones WHERE id = ?').run(id);
    res.json({ message: 'Clone removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover clone' });
  }
});

// ===== ESTATÍSTICAS DO BANCO GENÉTICO =====

router.get('/genetic-bank/stats', (req: Request, res: Response) => {
  try {
    const stats = {
      genetics: db.prepare('SELECT COUNT(*) as count FROM genetic_strains WHERE is_active = 1').get() as any,
      seed_batches: db.prepare('SELECT COUNT(*) as count FROM seed_batches WHERE is_active = 1').get() as any,
      total_seeds: db.prepare('SELECT COALESCE(SUM(current_quantity), 0) as count FROM seed_batches WHERE is_active = 1').get() as any,
      clones: {
        total: db.prepare('SELECT COUNT(*) as count FROM clones').get() as any,
        rooting: db.prepare("SELECT COUNT(*) as count FROM clones WHERE status = 'rooting'").get() as any,
        rooted: db.prepare("SELECT COUNT(*) as count FROM clones WHERE status = 'rooted'").get() as any,
        planted: db.prepare("SELECT COUNT(*) as count FROM clones WHERE status = 'planted'").get() as any,
      },
      plants_from_seeds: db.prepare('SELECT COUNT(*) as count FROM plants WHERE seed_batch_id IS NOT NULL').get() as any,
      plants_from_clones: db.prepare('SELECT COUNT(*) as count FROM plants WHERE source_clone_id IS NOT NULL').get() as any,
    };
    
    res.json({
      total_genetics: stats.genetics.count,
      total_batches: stats.seed_batches.count,
      total_seeds_available: stats.total_seeds.count,
      clones: {
        total: stats.clones.total.count,
        rooting: stats.clones.rooting.count,
        rooted: stats.clones.rooted.count,
        planted: stats.clones.planted.count,
      },
      plants_from_seeds: stats.plants_from_seeds.count,
      plants_from_clones: stats.plants_from_clones.count,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas do banco genético' });
  }
});

// ===== SEED BATCHES (Lotes de Sementes) =====

// Listar todos os lotes de sementes
router.get('/seed-batches', (req: Request, res: Response) => {
  try {
    const { available_only } = req.query;
    
    let batches;
    if (available_only === 'true') {
      batches = db.prepare(`
        SELECT 
          sb.*,
          gs.name as genetic_strain_name,
          gs.breeder as genetic_breeder
        FROM seed_batches sb
        LEFT JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id
        WHERE sb.is_active = 1 AND sb.current_quantity > 0
        ORDER BY sb.created_at DESC
      `).all();
    } else {
      batches = db.prepare(`
        SELECT 
          sb.*,
          gs.name as genetic_strain_name,
          gs.breeder as genetic_breeder
        FROM seed_batches sb
        LEFT JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id
        ORDER BY sb.created_at DESC
      `).all();
    }
    
    res.json(batches);
  } catch (error) {
    console.error('Erro ao buscar lotes de sementes:', error);
    res.status(500).json({ error: 'Erro ao buscar lotes de sementes' });
  }
});

// Buscar lote por ID
router.get('/seed-batches/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const batch = db.prepare(`
      SELECT 
        sb.*,
        gs.name as genetic_strain_name,
        gs.breeder as genetic_breeder
      FROM seed_batches sb
      LEFT JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id
      WHERE sb.id = ?
    `).get(id);
    
    if (!batch) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }
    
    res.json(batch);
  } catch (error) {
    console.error('Erro ao buscar lote:', error);
    res.status(500).json({ error: 'Erro ao buscar lote' });
  }
});

// Criar novo lote de sementes
router.post('/seed-batches', (req: Request, res: Response) => {
  try {
    const batchData = req.body;
    const batch = db.prepare(`
      INSERT INTO seed_batches (
        genetic_strain_id, batch_code, quantity_total, quantity_available,
        source, source_type, acquisition_date, purchase_date, initial_quantity,
        current_quantity, seed_type, generation, storage_location,
        storage_conditions, expiration_date, price_per_unit, supplier,
        germination_rate, plants_generated, is_active, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      batchData.genetic_strain_id,
      batchData.batch_code,
      batchData.quantity_total,
      batchData.quantity_available || batchData.quantity_total,
      batchData.source,
      batchData.source_type || 'purchased',
      batchData.acquisition_date,
      batchData.purchase_date,
      batchData.initial_quantity || batchData.quantity_total,
      batchData.current_quantity || batchData.quantity_total,
      batchData.seed_type || 'regular',
      batchData.generation || null,
      batchData.storage_location || null,
      batchData.storage_conditions || null,
      batchData.expiration_date,
      batchData.price_per_unit,
      batchData.supplier,
      batchData.germination_rate || null,
      batchData.plants_generated || 0,
      batchData.is_active !== undefined ? batchData.is_active : true,
      batchData.notes
    );
    
    const created = db.prepare(`
      SELECT 
        sb.*,
        gs.name as genetic_strain_name,
        gs.breeder as genetic_breeder
      FROM seed_batches sb
      LEFT JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id
      WHERE sb.id = ?
    `).get(batch.lastInsertRowid);
    
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Erro ao criar lote:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Já existe um lote com este código' });
    } else {
      res.status(500).json({ error: 'Erro ao criar lote' });
    }
  }
});

// Atualizar lote
router.put('/seed-batches/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const batchData = req.body;
    
    const fields = [];
    const values = [];
    
    if (batchData.genetic_strain_id !== undefined) { fields.push('genetic_strain_id = ?'); values.push(batchData.genetic_strain_id); }
    if (batchData.batch_code !== undefined) { fields.push('batch_code = ?'); values.push(batchData.batch_code); }
    if (batchData.quantity_total !== undefined) { fields.push('quantity_total = ?'); values.push(batchData.quantity_total); }
    if (batchData.quantity_available !== undefined) { fields.push('quantity_available = ?'); values.push(batchData.quantity_available); }
    if (batchData.source !== undefined) { fields.push('source = ?'); values.push(batchData.source); }
    if (batchData.source_type !== undefined) { fields.push('source_type = ?'); values.push(batchData.source_type); }
    if (batchData.acquisition_date !== undefined) { fields.push('acquisition_date = ?'); values.push(batchData.acquisition_date); }
    if (batchData.purchase_date !== undefined) { fields.push('purchase_date = ?'); values.push(batchData.purchase_date); }
    if (batchData.initial_quantity !== undefined) { fields.push('initial_quantity = ?'); values.push(batchData.initial_quantity); }
    if (batchData.current_quantity !== undefined) { fields.push('current_quantity = ?'); values.push(batchData.current_quantity); }
    if (batchData.seed_type !== undefined) { fields.push('seed_type = ?'); values.push(batchData.seed_type); }
    if (batchData.generation !== undefined) { fields.push('generation = ?'); values.push(batchData.generation); }
    if (batchData.storage_location !== undefined) { fields.push('storage_location = ?'); values.push(batchData.storage_location); }
    if (batchData.storage_conditions !== undefined) { fields.push('storage_conditions = ?'); values.push(batchData.storage_conditions); }
    if (batchData.expiration_date !== undefined) { fields.push('expiration_date = ?'); values.push(batchData.expiration_date); }
    if (batchData.price_per_unit !== undefined) { fields.push('price_per_unit = ?'); values.push(batchData.price_per_unit); }
    if (batchData.supplier !== undefined) { fields.push('supplier = ?'); values.push(batchData.supplier); }
    if (batchData.germination_rate !== undefined) { fields.push('germination_rate = ?'); values.push(batchData.germination_rate); }
    if (batchData.plants_generated !== undefined) { fields.push('plants_generated = ?'); values.push(batchData.plants_generated); }
    if (batchData.is_active !== undefined) { fields.push('is_active = ?'); values.push(batchData.is_active); }
    if (batchData.notes !== undefined) { fields.push('notes = ?'); values.push(batchData.notes); }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    
    const query = `UPDATE seed_batches SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    
    const result = db.prepare(query).run(...values);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }
    
    const updated = db.prepare(`
      SELECT 
        sb.*,
        gs.name as genetic_strain_name,
        gs.breeder as genetic_breeder
      FROM seed_batches sb
      LEFT JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id
      WHERE sb.id = ?
    `).get(id);
    
    res.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar lote:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Já existe um lote com este código' });
    } else {
      res.status(500).json({ error: 'Erro ao atualizar lote' });
    }
  }
});

// Atualizar quantidade de sementes
router.patch('/seed-batches/:id/quantity', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity_available } = req.body;
    
    if (quantity_available === undefined || quantity_available < 0) {
      return res.status(400).json({ error: 'Quantidade deve ser maior ou igual a 0' });
    }
    
    const result = db.prepare(`
      UPDATE seed_batches 
      SET quantity_available = ?, updated_at = ? 
      WHERE id = ?
    `).run(quantity_available, new Date().toISOString(), id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }
    
    res.json({ message: 'Quantidade atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar quantidade:', error);
    res.status(500).json({ error: 'Erro ao atualizar quantidade' });
  }
});

// Deletar lote
router.delete('/seed-batches/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = db.prepare('DELETE FROM seed_batches WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }
    
    res.json({ message: 'Lote removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar lote:', error);
    res.status(500).json({ error: 'Erro ao deletar lote' });
  }
});

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
    const batch = db.prepare(`
      SELECT 
        sb.*,
        gs.name as genetic_name
      FROM seed_batches sb
      LEFT JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id
      WHERE sb.id = ?
    `).get(id) as any;
    
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
      const code = (db.prepare('SELECT COALESCE(MAX(CAST(SUBSTR(code, 5) AS INTEGER)), 0) + 1 as next_code FROM plants').get() as any).next_code;
      const plantCode = `VASO${String(code).padStart(3, '0')}`;
      
      const plant = db.prepare(`
        INSERT INTO plants (
          name, genetic, code, planting_date, germination_date, days_to_germination,
          substrate, substrate_other, current_phase, current_location, status,
          failure_date, failure_reason, photo_path, profile_photo,
          seed_batch_id, source_clone_id, origin_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `${batch.genetic_name} #${i + 1}`,
        batch.genetic_name,
        plantCode,
        plantingDate,
        null,
        null,
        substrate || 'Terra vegetal',
        substrate_other || null,
        'germinacao',
        location || null,
        'ativa',
        null,
        null,
        null,
        null,
        batch.id,
        null,
        'seed',
        new Date().toISOString()
      );
      
      const createdPlant = db.prepare(`
        SELECT 
          p.*,
          sb.batch_code as seed_batch_code,
          gs.name as genetic_strain_name,
          gs.breeder as genetic_breeder
        FROM plants p
        LEFT JOIN seed_batches sb ON p.seed_batch_id = sb.id
        LEFT JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id
        WHERE p.id = ?
      `).get(plant.lastInsertRowid);
      
      createdPlants.push(createdPlant);
    }
    
    // Decrementar quantidade de sementes no lote
    db.prepare(`
      UPDATE seed_batches 
      SET current_quantity = current_quantity - ?, 
          plants_generated = COALESCE(plants_generated, 0) + ?,
          updated_at = ?
      WHERE id = ?
    `).run(quantity, quantity, new Date().toISOString(), id);
    
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
