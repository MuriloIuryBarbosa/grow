const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const plantRepository = require('./src/repositories/plant.repository');
const phaseHistoryRepository = require('./src/repositories/phase-history.repository');
const recordRepository = require('./src/repositories/record.repository');
const sensorRepository = require('./src/repositories/sensor.repository');
const sensorReadingRepository = require('./src/repositories/sensor-reading.repository');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURAÇÃO DE UPLOAD
// ============================================
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens são permitidas!'));
  }
});

// ============================================
// MIDDLEWARES
// ============================================
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// ============================================
// ROTAS DE PLANTAS
// ============================================

// GET /plants - Listar todas as plantas
app.get('/plants', async (req, res, next) => {
  try {
    const plants = plantRepository.findAll();
    res.json(plants);
  } catch (error) {
    next(error);
  }
});

// GET /plants/:id - Buscar planta específica
app.get('/plants/:id', async (req, res, next) => {
  try {
    const plant = plantRepository.findById(req.params.id);
    
    if (!plant) {
      return res.status(404).json({ error: 'Planta não encontrada' });
    }
    
    // Incluir histórico de fases
    plant.phase_history = phaseHistoryRepository.findByPlantId(req.params.id);
    
    res.json(plant);
  } catch (error) {
    next(error);
  }
});

// POST /plants - Criar nova planta
app.post('/plants', async (req, res, next) => {
  try {
    const plant = plantRepository.create(req.body);
    
    // Criar registro inicial de fase
    phaseHistoryRepository.create(
      plant.id,
      plant.current_phase,
      plant.germination_date || plant.planting_date,
      'Fase inicial'
    );
    
    res.status(201).json(plant);
  } catch (error) {
    next(error);
  }
});

// PUT /plants/:id - Atualizar planta
app.put('/plants/:id', async (req, res, next) => {
  try {
    const plant = plantRepository.update(req.params.id, req.body);
    res.json(plant);
  } catch (error) {
    next(error);
  }
});

// PUT /plants/:id/phase - Atualizar fase da planta
app.put('/plants/:id/phase', async (req, res, next) => {
  try {
    const { phase } = req.body;
    
    // Mudar fase no histórico
    phaseHistoryRepository.changePlantPhase(req.params.id, phase);
    
    // Atualizar fase atual na planta
    const plant = plantRepository.updatePhase(req.params.id, phase);
    
    // Incluir histórico atualizado
    plant.phase_history = phaseHistoryRepository.findByPlantId(req.params.id);
    
    res.json(plant);
  } catch (error) {
    next(error);
  }
});

// POST /plants/:id/photo - Upload de foto da planta
app.post('/plants/:id/photo', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma foto enviada' });
    }
    
    const photo_path = `/uploads/${req.file.filename}`;
    const plant = plantRepository.updatePhoto(req.params.id, photo_path);
    
    res.json(plant);
  } catch (error) {
    next(error);
  }
});

// DELETE /plants/:id - Deletar planta
app.delete('/plants/:id', async (req, res, next) => {
  try {
    plantRepository.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// ROTAS DE REGISTROS DIÁRIOS
// ============================================

// GET /plants/:plantId/records - Listar registros de uma planta
app.get('/plants/:plantId/records', async (req, res, next) => {
  try {
    const records = recordRepository.findByPlantId(req.params.plantId);
    res.json(records);
  } catch (error) {
    next(error);
  }
});

// GET /plants/:plantId/records/:recordId - Buscar registro específico
app.get('/plants/:plantId/records/:recordId', async (req, res, next) => {
  try {
    const record = recordRepository.findById(req.params.recordId, req.params.plantId);
    
    if (!record) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }
    
    res.json(record);
  } catch (error) {
    next(error);
  }
});

// POST /plants/:plantId/records - Criar novo registro
app.post('/plants/:plantId/records', upload.single('photo'), async (req, res, next) => {
  try {
    const recordData = {
      ...req.body,
      plant_id: parseInt(req.params.plantId),
      photo_path: req.file ? `/uploads/${req.file.filename}` : null
    };
    
    const record = recordRepository.create(recordData);
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

// PUT /plants/:plantId/records/:recordId - Atualizar registro
app.put('/plants/:plantId/records/:recordId', upload.single('photo'), async (req, res, next) => {
  try {
    const recordData = {
      ...req.body,
      photo_path: req.file ? `/uploads/${req.file.filename}` : undefined
    };
    
    const record = recordRepository.update(
      req.params.recordId,
      req.params.plantId,
      recordData
    );
    
    res.json(record);
  } catch (error) {
    next(error);
  }
});

// DELETE /plants/:plantId/records/:recordId - Deletar registro
app.delete('/plants/:plantId/records/:recordId', async (req, res, next) => {
  try {
    recordRepository.delete(req.params.recordId, req.params.plantId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// ROTAS - SENSORES
// ============================================

// GET /sensors - Listar todos os sensores
app.get('/sensors', async (req, res, next) => {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    const sensors = sensorRepository.findAll(includeInactive);
    res.json(sensors);
  } catch (error) {
    next(error);
  }
});

// GET /sensors/latest - Últimas leituras de cada sensor
app.get('/sensors/latest', async (req, res, next) => {
  try {
    const readings = sensorRepository.getLatestReadings();
    res.json(readings);
  } catch (error) {
    next(error);
  }
});

// GET /sensors/:id - Buscar sensor por ID
app.get('/sensors/:id', async (req, res, next) => {
  try {
    const sensor = sensorRepository.findById(req.params.id);
    if (!sensor) {
      return res.status(404).json({ error: 'Sensor não encontrado' });
    }
    res.json(sensor);
  } catch (error) {
    next(error);
  }
});

// POST /sensors - Criar novo sensor
app.post('/sensors', async (req, res, next) => {
  try {
    const sensor = sensorRepository.create(req.body);
    res.status(201).json(sensor);
  } catch (error) {
    next(error);
  }
});

// PUT /sensors/:id - Atualizar sensor
app.put('/sensors/:id', async (req, res, next) => {
  try {
    const sensor = sensorRepository.update(req.params.id, req.body);
    res.json(sensor);
  } catch (error) {
    next(error);
  }
});

// PATCH /sensors/:id/toggle - Ativar/Desativar sensor
app.patch('/sensors/:id/toggle', async (req, res, next) => {
  try {
    const { is_active } = req.body;
    const sensor = sensorRepository.toggleActive(req.params.id, is_active);
    res.json(sensor);
  } catch (error) {
    next(error);
  }
});

// DELETE /sensors/:id - Deletar sensor (soft delete)
app.delete('/sensors/:id', async (req, res, next) => {
  try {
    sensorRepository.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// ROTAS - LEITURAS DOS SENSORES
// ============================================

// GET /sensors/:sensorId/readings - Buscar leituras de um sensor
app.get('/sensors/:sensorId/readings', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const readings = sensorReadingRepository.findBySensorId(req.params.sensorId, limit);
    res.json(readings);
  } catch (error) {
    next(error);
  }
});

// GET /sensors/:sensorId/readings/latest - Última leitura de um sensor
app.get('/sensors/:sensorId/readings/latest', async (req, res, next) => {
  try {
    const reading = sensorReadingRepository.getLatestBySensorId(req.params.sensorId);
    if (!reading) {
      return res.status(404).json({ error: 'Nenhuma leitura encontrada' });
    }
    res.json(reading);
  } catch (error) {
    next(error);
  }
});

// GET /sensors/:sensorId/stats - Estatísticas do sensor
app.get('/sensors/:sensorId/stats', async (req, res, next) => {
  try {
    const stats = sensorReadingRepository.getStats(req.params.sensorId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET /readings/daily - Médias diárias de todos os sensores
app.get('/readings/daily', async (req, res, next) => {
  try {
    const { start_date, end_date, sensor_id } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date e end_date são obrigatórios' });
    }
    
    const averages = sensorReadingRepository.getDailyAverages(
      start_date, 
      end_date, 
      sensor_id || null
    );
    res.json(averages);
  } catch (error) {
    next(error);
  }
});

// GET /readings/range - Buscar leituras por período
app.get('/readings/range', async (req, res, next) => {
  try {
    const { start_date, end_date, sensor_id } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date e end_date são obrigatórios' });
    }
    
    const readings = sensorReadingRepository.findByDateRange(
      sensor_id || null,
      start_date,
      end_date
    );
    res.json(readings);
  } catch (error) {
    next(error);
  }
});

// POST /readings - Criar nova leitura
app.post('/readings', async (req, res, next) => {
  try {
    const reading = sensorReadingRepository.create(req.body);
    res.status(201).json(reading);
  } catch (error) {
    next(error);
  }
});

// POST /readings/batch - Criar múltiplas leituras
app.post('/readings/batch', async (req, res, next) => {
  try {
    const { readings } = req.body;
    
    if (!Array.isArray(readings)) {
      return res.status(400).json({ error: 'readings deve ser um array' });
    }
    
    const result = sensorReadingRepository.createBatch(readings);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// PUT /readings/:id - Atualizar leitura
app.put('/readings/:id', async (req, res, next) => {
  try {
    const reading = sensorReadingRepository.update(req.params.id, req.body);
    res.json(reading);
  } catch (error) {
    next(error);
  }
});

// DELETE /readings/:id - Deletar leitura
app.delete('/readings/:id', async (req, res, next) => {
  try {
    sensorReadingRepository.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
  console.log(`🌱 Backend rodando em http://localhost:${PORT}`);
});

module.exports = app;
