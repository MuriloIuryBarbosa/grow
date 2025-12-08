const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const db = new Database(path.join(__dirname, '../grow.db'));

// Configurar multer para upload de fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Função para obter timestamp local (BRT - UTC-3)
function getLocalTimestamp() {
  const now = new Date();
  const offset = -3 * 60; // BRT é UTC-3
  const localDate = new Date(now.getTime() + offset * 60 * 1000);
  return localDate.toISOString().slice(0, 19).replace('T', ' ');
}

// Criar tabela phase_history se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS phase_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL,
    phase TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_days INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
  );
`);

// Criar índices para melhorar performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_plants_status ON plants(status);
  CREATE INDEX IF NOT EXISTS idx_plants_created_at ON plants(created_at);
  CREATE INDEX IF NOT EXISTS idx_daily_records_plant_id ON daily_records(plant_id);
  CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(record_date);
`);

// Otimizar banco de dados
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('temp_store = MEMORY');

// Prepared statements para melhor performance
const statements = {
  getAllPlants: db.prepare('SELECT * FROM plants ORDER BY created_at DESC'),
  getPlantById: db.prepare('SELECT * FROM plants WHERE id = ?'),
  getRecordsByPlant: db.prepare('SELECT * FROM daily_records WHERE plant_id = ? ORDER BY record_date DESC'),
  getPhaseHistory: db.prepare('SELECT * FROM phase_history WHERE plant_id = ? ORDER BY started_at'),
  updatePlantPhase: db.prepare('UPDATE plants SET current_phase = ? WHERE id = ?'),
  deletePlant: db.prepare('DELETE FROM plants WHERE id = ?'),
};

// Middlewares
app.use(cors());
app.use(express.json());

// Servir uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Rotas de Plantas
app.get('/plants', (req, res) => {
  try {
    const plants = statements.getAllPlants.all();
    res.json(plants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/plants/:id', (req, res) => {
  try {
    console.log(`📥 GET /plants/${req.params.id}`);
    
    const plant = statements.getPlantById.get(req.params.id);
    if (!plant) {
      console.log(`❌ Planta ${req.params.id} não encontrada`);
      return res.status(404).json({ error: 'Planta não encontrada' });
    }
    
    console.log(`✅ Planta encontrada:`, plant.name);
    
    // Buscar histórico de fases
    const phaseHistory = statements.getPhaseHistory.all(req.params.id);
    console.log(`📊 Phase history encontrado: ${phaseHistory.length} registros`);
    
    plant.phase_history = phaseHistory;
    
    console.log(`✅ Enviando resposta para planta ${req.params.id}`);
    res.json(plant);
  } catch (error) {
    console.error(`❌ Erro ao buscar planta ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/plants', (req, res) => {
  try {
    const { name, code, genetic, planting_date, germination_date, substrate, current_phase, current_location, status } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO plants (name, code, genetic, planting_date, germination_date, substrate, current_phase, current_location, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(name, code, genetic || null, planting_date, germination_date || null, substrate, current_phase || 'germinacao', current_location || null, status || 'ativa');
    
    const plant = db.prepare('SELECT * FROM plants WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(plant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/plants/:id', (req, res) => {
  try {
    const updates = [];
    const values = [];
    
    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    values.push(req.params.id);
    
    db.prepare(`UPDATE plants SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    const plant = db.prepare('SELECT * FROM plants WHERE id = ?').get(req.params.id);
    res.json(plant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/plants/:id', (req, res) => {
  try {
    statements.deletePlant.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/plants/:id/phase', (req, res) => {
  try {
    const { phase } = req.body;
    const plantId = req.params.id;
    const currentTimestamp = getLocalTimestamp();
    
    // Buscar planta atual
    const plant = statements.getPlantById.get(plantId);
    if (!plant) {
      return res.status(404).json({ error: 'Planta não encontrada' });
    }
    
    // Se está mudando de fase, registrar no histórico
    if (plant.current_phase !== phase) {
      // Fechar a fase anterior (se houver)
      const lastPhase = db.prepare(
        'SELECT * FROM phase_history WHERE plant_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1'
      ).get(plantId);
      
      if (lastPhase) {
        const startDate = new Date(lastPhase.started_at);
        const endDate = new Date(currentTimestamp);
        const durationDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        db.prepare(
          'UPDATE phase_history SET ended_at = ?, duration_days = ? WHERE id = ?'
        ).run(currentTimestamp, durationDays, lastPhase.id);
      }
      
      // Criar novo registro de fase
      db.prepare(`
        INSERT INTO phase_history (plant_id, phase, started_at, notes)
        VALUES (?, ?, ?, ?)
      `).run(plantId, phase, currentTimestamp, `Mudança manual para ${phase}`);
    }
    
    // Atualizar fase da planta
    statements.updatePlantPhase.run(phase, plantId);
    
    // Retornar planta atualizada com histórico
    const updatedPlant = statements.getPlantById.get(plantId);
    const phaseHistory = statements.getPhaseHistory.all(plantId);
    updatedPlant.phase_history = phaseHistory;
    
    res.json(updatedPlant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/plants/:id/photo', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma foto enviada' });
    }

    const photo_path = `/uploads/${req.file.filename}`;
    
    // Deletar foto antiga se existir
    const oldPlant = db.prepare('SELECT photo_path FROM plants WHERE id = ?').get(req.params.id);
    if (oldPlant?.photo_path) {
      const oldPhotoPath = path.join(__dirname, '..', oldPlant.photo_path);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }
    
    db.prepare('UPDATE plants SET photo_path = ? WHERE id = ?').run(photo_path, req.params.id);
    const plant = statements.getPlantById.get(req.params.id);
    res.json(plant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rotas de Registros
app.get('/plants/:plantId/records', (req, res) => {
  try {
    console.log(`📥 GET /plants/${req.params.plantId}/records`);
    const records = statements.getRecordsByPlant.all(req.params.plantId);
    console.log(`✅ Registros encontrados: ${records.length}`);
    res.json(records);
  } catch (error) {
    console.error(`❌ Erro ao buscar registros da planta ${req.params.plantId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/plants/:plantId/records/:recordId', (req, res) => {
  try {
    const record = db.prepare('SELECT * FROM daily_records WHERE id = ? AND plant_id = ?').get(req.params.recordId, req.params.plantId);
    if (!record) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/plants/:plantId/records', upload.single('photo'), (req, res) => {
  try {
    const { record_date, plant_size, leaf_count, branch_count, temperature, humidity, ppfd, vpd, fertilization, observations, location } = req.body;
    const photo_path = req.file ? `/uploads/${req.file.filename}` : null;
    const created_at = getLocalTimestamp();
    
    const stmt = db.prepare(`
      INSERT INTO daily_records (plant_id, record_date, plant_size, leaf_count, branch_count, temperature, humidity, ppfd, vpd, fertilization, observations, location, photo_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      req.params.plantId, 
      record_date, 
      plant_size || null, 
      leaf_count || null, 
      branch_count || null, 
      temperature || null, 
      humidity || null, 
      ppfd || null, 
      vpd || null, 
      fertilization || null, 
      observations || null, 
      location || null,
      photo_path,
      created_at
    );
    
    const record = db.prepare('SELECT * FROM daily_records WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/plants/:plantId/records/:recordId', upload.single('photo'), (req, res) => {
  try {
    const { record_date, plant_size, leaf_count, branch_count, temperature, humidity, ppfd, vpd, fertilization, observations, location } = req.body;
    
    // Se tem nova foto, usar ela; senão manter a existente
    let photo_path = req.body.photo_path || null;
    if (req.file) {
      photo_path = `/uploads/${req.file.filename}`;
      
      // Deletar foto antiga se existir
      const oldRecord = db.prepare('SELECT photo_path FROM daily_records WHERE id = ?').get(req.params.recordId);
      if (oldRecord?.photo_path) {
        const oldPhotoPath = path.join(__dirname, '..', oldRecord.photo_path);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
    }
    
    const stmt = db.prepare(`
      UPDATE daily_records 
      SET record_date = ?, plant_size = ?, leaf_count = ?, branch_count = ?, 
          temperature = ?, humidity = ?, ppfd = ?, vpd = ?, 
          fertilization = ?, observations = ?, location = ?, photo_path = ?
      WHERE id = ? AND plant_id = ?
    `);
    
    stmt.run(
      record_date,
      plant_size || null,
      leaf_count || null,
      branch_count || null,
      temperature || null,
      humidity || null,
      ppfd || null,
      vpd || null,
      fertilization || null,
      observations || null,
      location || null,
      photo_path,
      req.params.recordId,
      req.params.plantId
    );
    
    const record = db.prepare('SELECT * FROM daily_records WHERE id = ?').get(req.params.recordId);
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/plants/:plantId/records/:recordId', (req, res) => {
  try {
    // Deletar foto se existir
    const record = db.prepare('SELECT photo_path FROM daily_records WHERE id = ?').get(req.params.recordId);
    if (record?.photo_path) {
      const photoPath = path.join(__dirname, '..', record.photo_path);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
    
    db.prepare('DELETE FROM daily_records WHERE id = ? AND plant_id = ?').run(req.params.recordId, req.params.plantId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Estatísticas
app.get('/statistics', (req, res) => {
  try {
    const total_plants = db.prepare('SELECT COUNT(*) as count FROM plants').get().count;
    const by_phase = {
      germinacao: db.prepare("SELECT COUNT(*) as count FROM plants WHERE current_phase = 'germinacao'").get().count,
      muda: db.prepare("SELECT COUNT(*) as count FROM plants WHERE current_phase = 'muda'").get().count,
      vegetacao: db.prepare("SELECT COUNT(*) as count FROM plants WHERE current_phase = 'vegetacao'").get().count,
      floracao: db.prepare("SELECT COUNT(*) as count FROM plants WHERE current_phase = 'floracao'").get().count,
    };
    
    res.json({ total_plants, by_phase });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({ message: '🌱 Grow System API', version: '1.0.0' });
});

app.listen(3000, () => {
  console.log('🌱 Backend rodando em http://localhost:3000');
});
