import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../../grow.db'));

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// Criar tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    genetic TEXT,
    code TEXT UNIQUE NOT NULL,
    planting_date TEXT NOT NULL,
    germination_date TEXT,
    days_to_germination INTEGER,
    substrate TEXT NOT NULL,
    substrate_other TEXT,
    current_phase TEXT DEFAULT 'germinacao',
    current_location TEXT,
    status TEXT DEFAULT 'ativa',
    failure_date TEXT,
    failure_reason TEXT,
    photo_path TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS daily_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL,
    record_date TEXT NOT NULL,
    plant_size REAL,
    leaf_count INTEGER,
    branch_count INTEGER,
    temperature REAL,
    humidity REAL,
    ppfd REAL,
    vpd REAL,
    fertilization TEXT,
    observations TEXT,
    location TEXT,
    photo_path TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS daily_record_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    photo_path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (record_id) REFERENCES daily_records(id) ON DELETE CASCADE
  );

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

  CREATE INDEX IF NOT EXISTS idx_plant_code ON plants(code);
  CREATE INDEX IF NOT EXISTS idx_daily_records_plant ON daily_records(plant_id);
  CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(record_date);
  CREATE INDEX IF NOT EXISTS idx_phase_history_plant ON phase_history(plant_id);

  CREATE TABLE IF NOT EXISTS sensors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('temperature', 'humidity', 'temperature_humidity')),
    location TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', '-3 hours')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', '-3 hours'))
  );

  CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id INTEGER NOT NULL,
    temperature REAL,
    humidity REAL,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now', '-3 hours')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '-3 hours')),
    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,
    CHECK (temperature IS NOT NULL OR humidity IS NOT NULL)
  );

  CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);
  CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON sensor_readings(recorded_at);
  CREATE INDEX IF NOT EXISTS idx_sensors_is_active ON sensors(is_active);

  -- ============================================
  -- GENETIC BANK TABLES
  -- ============================================

  -- Tabela de genéticas/strains
  CREATE TABLE IF NOT EXISTS genetic_strains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    breeder TEXT,
    type TEXT CHECK(type IN ('indica', 'sativa', 'hybrid', 'ruderalis', 'unknown')),
    indica_percentage INTEGER CHECK(indica_percentage IS NULL OR (indica_percentage >= 0 AND indica_percentage <= 100)),
    sativa_percentage INTEGER CHECK(sativa_percentage IS NULL OR (sativa_percentage >= 0 AND sativa_percentage <= 100)),
    flowering_time_min INTEGER,
    flowering_time_max INTEGER,
    height_indoor TEXT,
    height_outdoor TEXT,
    yield_indoor TEXT,
    yield_outdoor TEXT,
    difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
    thc_percentage TEXT,
    cbd_percentage TEXT,
    flavors TEXT,
    effects TEXT,
    description TEXT,
    grow_notes TEXT,
    photo_path TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '-3 hours')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', '-3 hours'))
  );

  -- Tabela de lotes de sementes
  CREATE TABLE IF NOT EXISTS seed_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    genetic_strain_id INTEGER NOT NULL,
    batch_code TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    source_type TEXT CHECK(source_type IN ('purchased', 'gifted', 'harvested', 'traded')),
    acquisition_date TEXT NOT NULL,
    initial_quantity INTEGER NOT NULL CHECK(initial_quantity > 0),
    current_quantity INTEGER NOT NULL DEFAULT 0,
    seed_type TEXT CHECK(seed_type IN ('regular', 'feminized', 'autoflower', 'cbd', 'unknown')),
    generation TEXT,
    storage_location TEXT,
    storage_conditions TEXT,
    expiration_date TEXT,
    germination_rate REAL,
    plants_generated INTEGER DEFAULT 0,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '-3 hours')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', '-3 hours')),
    FOREIGN KEY (genetic_strain_id) REFERENCES genetic_strains(id) ON DELETE RESTRICT
  );

  -- Tabela de clones
  CREATE TABLE IF NOT EXISTS clones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mother_plant_id INTEGER NOT NULL,
    clone_code TEXT UNIQUE NOT NULL,
    cut_date TEXT NOT NULL,
    rooting_date TEXT,
    days_to_root INTEGER,
    status TEXT NOT NULL DEFAULT 'rooting' 
      CHECK(status IN ('rooting', 'rooted', 'planted', 'failed', 'discarded')),
    destination_plant_id INTEGER,
    rooting_method TEXT,
    rooting_medium TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '-3 hours')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', '-3 hours')),
    FOREIGN KEY (mother_plant_id) REFERENCES plants(id) ON DELETE RESTRICT,
    FOREIGN KEY (destination_plant_id) REFERENCES plants(id) ON DELETE SET NULL
  );

  -- Índices para performance
  CREATE INDEX IF NOT EXISTS idx_genetic_strains_name ON genetic_strains(name);
  CREATE INDEX IF NOT EXISTS idx_genetic_strains_active ON genetic_strains(is_active);
  CREATE INDEX IF NOT EXISTS idx_seed_batches_genetic ON seed_batches(genetic_strain_id);
  CREATE INDEX IF NOT EXISTS idx_seed_batches_code ON seed_batches(batch_code);
  CREATE INDEX IF NOT EXISTS idx_seed_batches_active ON seed_batches(is_active);
  CREATE INDEX IF NOT EXISTS idx_clones_mother ON clones(mother_plant_id);
  CREATE INDEX IF NOT EXISTS idx_clones_status ON clones(status);
  CREATE INDEX IF NOT EXISTS idx_clones_code ON clones(clone_code);
`);

// Adicionar colunas de rastreabilidade genética na tabela plants (se não existirem)
try {
  db.exec(`ALTER TABLE plants ADD COLUMN seed_batch_id INTEGER REFERENCES seed_batches(id) ON DELETE SET NULL`);
} catch (e) {
  // Coluna já existe
}

try {
  db.exec(`ALTER TABLE plants ADD COLUMN source_clone_id INTEGER REFERENCES clones(id) ON DELETE SET NULL`);
} catch (e) {
  // Coluna já existe
}

try {
  db.exec(`ALTER TABLE plants ADD COLUMN origin_type TEXT DEFAULT 'unknown' CHECK(origin_type IN ('seed', 'clone', 'unknown'))`);
} catch (e) {
  // Coluna já existe
}

try {
  db.exec(`ALTER TABLE plants ADD COLUMN profile_photo TEXT`);
} catch (e) {
  // Coluna já existe
}

// Criar índices para as novas colunas
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_plants_seed_batch ON plants(seed_batch_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_plants_source_clone ON plants(source_clone_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_plants_origin_type ON plants(origin_type)`);
} catch (e) {
  // Índices já existem
}

// ============================================
// TABELA: recipes
// Receitas para processos de cultivo
// ============================================
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL CHECK(length(name) >= 2),
      process_type TEXT NOT NULL CHECK(process_type IN ('germination', 'vegetation', 'flowering')),
      ingredients TEXT NOT NULL, -- JSON array: [{name: string, amount: number, unit: string}]
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);
} catch (e) {
  console.log('Erro ao criar tabela recipes:', e);
}

export default db;
