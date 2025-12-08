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
`);

export default db;
