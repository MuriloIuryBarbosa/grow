import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import routes from './routes';
import geneticsRoutes from './routes-genetics';
import './database'; // Inicializar banco de dados

const app = express();
const PORT = process.env.PORT || 3000;

// Criar diretório para uploads se não existir
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurar multer para upload de fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(uploadsDir));

// Rota de upload de fotos
app.post('/api/upload', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const photoPath = `/uploads/${req.file.filename}`;
    res.json({ photoPath });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao fazer upload' });
  }
});

// Rotas da API
app.use('/api', routes);
app.use('/api', geneticsRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({ 
    message: '🌱 Grow System API',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      plants: '/api/plants',
      records: '/api/records',
      statistics: '/api/statistics',
      genetics: '/api/genetics',
      seedBatches: '/api/seed-batches',
      clones: '/api/clones',
      geneticBankStats: '/api/genetic-bank/stats',
      upload: '/api/upload'
    }
  });
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌱 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 API disponível em http://localhost:${PORT}/api`);
  console.log(`📁 Uploads em ${uploadsDir}`);
});

export default app;