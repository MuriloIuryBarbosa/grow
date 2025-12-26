-- ============================================
-- GROW - Sistema de Gerenciamento de Cultivo
-- Schema do Banco de Dados - Versão 2.0
-- ============================================

-- Limpar banco (usar com cuidado!)
-- DROP TABLE IF EXISTS phase_history;
-- DROP TABLE IF EXISTS daily_records;
-- DROP TABLE IF EXISTS plants;

-- ============================================
-- TABELA: plants
-- Armazena informações das plantas cultivadas
-- ============================================
CREATE TABLE IF NOT EXISTS plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Identificação
    name TEXT NOT NULL CHECK(length(name) >= 2),
    genetic TEXT CHECK(length(genetic) >= 2),
    code TEXT UNIQUE NOT NULL CHECK(length(code) >= 2),
    
    -- Datas importantes
    planting_date TEXT NOT NULL,
    germination_date TEXT,
    days_to_germination INTEGER CHECK(days_to_germination >= 0),
    
    -- Cultivo
    substrate TEXT NOT NULL,
    substrate_other TEXT,
    current_phase TEXT NOT NULL DEFAULT 'germinacao' 
        CHECK(current_phase IN ('germinacao', 'muda', 'vegetacao', 'floracao')),
    current_location TEXT,
    
    -- Mídia
    photo_path TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'ativa' 
        CHECK(status IN ('ativa', 'morta', 'colhida')),
    failure_date TEXT,
    failure_reason TEXT,
    
    -- Metadados
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- ============================================
-- TABELA: phase_history
-- Histórico de mudanças de fase das plantas
-- ============================================
CREATE TABLE IF NOT EXISTS phase_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL,
    
    -- Informações da fase
    phase TEXT NOT NULL CHECK(phase IN ('germinacao', 'muda', 'vegetacao', 'floracao')),
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_days INTEGER CHECK(duration_days >= 0),
    notes TEXT,
    
    -- Metadados
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE,
    
    -- Garantir que não haja sobreposição de fases
    CHECK(ended_at IS NULL OR started_at < ended_at)
);

-- ============================================
-- TABELA: daily_records
-- Registros diários de monitoramento
-- ============================================
CREATE TABLE IF NOT EXISTS daily_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL,
    
    -- Data do registro
    record_date TEXT NOT NULL,
    location TEXT,
    
    -- Métricas da planta
    plant_size REAL CHECK(plant_size IS NULL OR plant_size >= 0),
    leaf_count INTEGER CHECK(leaf_count IS NULL OR leaf_count >= 0),
    branch_count INTEGER CHECK(branch_count IS NULL OR branch_count >= 0),
    
    -- Condições ambientais
    temperature REAL CHECK(temperature IS NULL OR (temperature >= -10 AND temperature <= 60)),
    humidity REAL CHECK(humidity IS NULL OR (humidity >= 0 AND humidity <= 100)),
    ppfd REAL CHECK(ppfd IS NULL OR ppfd >= 0),
    vpd REAL CHECK(vpd IS NULL OR vpd >= 0),
    
    -- Observações
    fertilization TEXT,
    observations TEXT,
    
    -- Mídia
    photo_path TEXT,
    
    -- Metadados
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE,
    
    -- Garantir apenas um registro por planta por dia
    UNIQUE(plant_id, record_date)
);

-- ============================================
-- ÍNDICES para Performance
-- ============================================

-- Plantas
CREATE INDEX IF NOT EXISTS idx_plants_code ON plants(code);
CREATE INDEX IF NOT EXISTS idx_plants_status ON plants(status);
CREATE INDEX IF NOT EXISTS idx_plants_phase ON plants(current_phase);
CREATE INDEX IF NOT EXISTS idx_plants_created_at ON plants(created_at);

-- Histórico de fases
CREATE INDEX IF NOT EXISTS idx_phase_history_plant ON phase_history(plant_id);
CREATE INDEX IF NOT EXISTS idx_phase_history_phase ON phase_history(phase);
CREATE INDEX IF NOT EXISTS idx_phase_history_dates ON phase_history(started_at, ended_at);

-- Registros diários
CREATE INDEX IF NOT EXISTS idx_daily_records_plant ON daily_records(plant_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(record_date);
CREATE INDEX IF NOT EXISTS idx_daily_records_plant_date ON daily_records(plant_id, record_date);

-- ============================================
-- TRIGGERS para Automação
-- ============================================

-- Atualizar updated_at em plants
CREATE TRIGGER IF NOT EXISTS update_plants_timestamp 
AFTER UPDATE ON plants
FOR EACH ROW
BEGIN
    UPDATE plants SET updated_at = datetime('now', 'localtime')
    WHERE id = NEW.id;
END;

-- Atualizar updated_at em daily_records
CREATE TRIGGER IF NOT EXISTS update_daily_records_timestamp 
AFTER UPDATE ON daily_records
FOR EACH ROW
BEGIN
    UPDATE daily_records SET updated_at = datetime('now', 'localtime')
    WHERE id = NEW.id;
END;

-- Calcular duration_days automaticamente ao fechar fase
CREATE TRIGGER IF NOT EXISTS calculate_phase_duration
AFTER UPDATE OF ended_at ON phase_history
FOR EACH ROW
WHEN NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL
BEGIN
    UPDATE phase_history 
    SET duration_days = CAST((julianday(NEW.ended_at) - julianday(NEW.started_at)) AS INTEGER)
    WHERE id = NEW.id;
END;

-- ============================================
-- VIEWS para Consultas Comuns
-- ============================================

-- View: Plantas com estatísticas completas
CREATE VIEW IF NOT EXISTS v_plants_stats AS
SELECT 
    p.*,
    CAST((julianday('now') - julianday(p.planting_date)) AS INTEGER) as total_days,
    CASE 
        WHEN p.germination_date IS NOT NULL 
        THEN CAST((julianday('now') - julianday(p.germination_date)) AS INTEGER)
        ELSE NULL 
    END as days_from_germination,
    (SELECT COUNT(*) FROM daily_records WHERE plant_id = p.id) as total_records,
    (SELECT COUNT(*) FROM phase_history WHERE plant_id = p.id) as total_phases
FROM plants p;

-- View: Últimos registros de cada planta
CREATE VIEW IF NOT EXISTS v_latest_records AS
SELECT dr.*
FROM daily_records dr
INNER JOIN (
    SELECT plant_id, MAX(record_date) as max_date
    FROM daily_records
    GROUP BY plant_id
) latest ON dr.plant_id = latest.plant_id AND dr.record_date = latest.max_date;


PRAGMA foreign_keys = ON;

PRAGMA journal_mode = WAL;

PRAGMA synchronous = NORMAL;

PRAGMA cache_size = -64000;

PRAGMA temp_store = MEMORY;

-- ============================================
-- TABELA: daily_record_photos
-- Armazena múltiplas fotos por registro diário
-- ============================================
CREATE TABLE IF NOT EXISTS daily_record_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    photo_path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (record_id) REFERENCES daily_records(id) ON DELETE CASCADE
);
