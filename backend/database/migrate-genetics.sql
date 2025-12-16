-- ============================================
-- GROW - Migração: Sistema de Banco Genético
-- Versão: 3.0
-- Data: 2025-12-16
-- ============================================

-- ============================================
-- TABELA: genetic_strains
-- Catálogo de genéticas/strains disponíveis
-- ============================================
CREATE TABLE IF NOT EXISTS genetic_strains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Identificação
    name TEXT NOT NULL UNIQUE CHECK(length(name) >= 2),
    breeder TEXT,                           -- Criador/Banco de sementes origem
    
    -- Características genéticas
    type TEXT CHECK(type IN ('indica', 'sativa', 'hybrid', 'ruderalis', 'unknown')),
    indica_percentage INTEGER CHECK(indica_percentage IS NULL OR (indica_percentage >= 0 AND indica_percentage <= 100)),
    sativa_percentage INTEGER CHECK(sativa_percentage IS NULL OR (sativa_percentage >= 0 AND sativa_percentage <= 100)),
    
    -- Informações de cultivo
    flowering_time_min INTEGER,             -- Tempo mínimo de floração (dias)
    flowering_time_max INTEGER,             -- Tempo máximo de floração (dias)
    height_indoor TEXT,                     -- Altura indoor (ex: "60-100cm")
    height_outdoor TEXT,                    -- Altura outdoor
    yield_indoor TEXT,                      -- Produção indoor (ex: "400-500g/m²")
    yield_outdoor TEXT,                     -- Produção outdoor
    difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
    
    -- Características organolépticas
    thc_percentage TEXT,                    -- Range de THC (ex: "18-22%")
    cbd_percentage TEXT,                    -- Range de CBD
    flavors TEXT,                           -- Sabores (JSON array)
    effects TEXT,                           -- Efeitos (JSON array)
    
    -- Descrição e notas
    description TEXT,
    grow_notes TEXT,                        -- Notas de cultivo
    
    -- Mídia
    photo_path TEXT,
    
    -- Metadados
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- ============================================
-- TABELA: seed_batches
-- Lotes de sementes de cada genética
-- ============================================
CREATE TABLE IF NOT EXISTS seed_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    genetic_strain_id INTEGER NOT NULL,
    
    -- Identificação do lote
    batch_code TEXT UNIQUE NOT NULL,        -- Código único do lote (ex: "GSC-2025-001")
    
    -- Origem
    source TEXT NOT NULL,                   -- Onde foi adquirido (banco, presente, coleta)
    source_type TEXT CHECK(source_type IN ('purchased', 'gifted', 'harvested', 'traded')),
    acquisition_date TEXT NOT NULL,
    
    -- Quantidade
    initial_quantity INTEGER NOT NULL CHECK(initial_quantity > 0),
    current_quantity INTEGER NOT NULL DEFAULT 0,
    
    -- Qualidade
    seed_type TEXT CHECK(seed_type IN ('regular', 'feminized', 'autoflower', 'cbd', 'unknown')),
    generation TEXT,                        -- F1, F2, S1, etc.
    
    -- Armazenamento
    storage_location TEXT,
    storage_conditions TEXT,                -- Condições de armazenamento
    
    -- Validade estimada
    expiration_date TEXT,
    
    -- Estatísticas
    germination_rate REAL,                  -- Taxa de germinação observada (0-100%)
    plants_generated INTEGER DEFAULT 0,     -- Quantas plantas foram geradas
    
    -- Notas
    notes TEXT,
    
    -- Metadados
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    
    FOREIGN KEY (genetic_strain_id) REFERENCES genetic_strains(id) ON DELETE RESTRICT
);

-- ============================================
-- TABELA: clones
-- Registro de clones (mudas) de plantas mãe
-- ============================================
CREATE TABLE IF NOT EXISTS clones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Origem
    mother_plant_id INTEGER NOT NULL,       -- Planta mãe de onde foi cortado
    
    -- Identificação
    clone_code TEXT UNIQUE NOT NULL,        -- Código único (ex: "CLN-GSC-001")
    
    -- Data do corte
    cut_date TEXT NOT NULL,
    rooting_date TEXT,                      -- Data que enraizou
    days_to_root INTEGER,                   -- Dias para enraizar
    
    -- Status
    status TEXT NOT NULL DEFAULT 'rooting' 
        CHECK(status IN ('rooting', 'rooted', 'planted', 'failed', 'discarded')),
    
    -- Destino
    destination_plant_id INTEGER,           -- ID da planta criada a partir deste clone
    
    -- Método
    rooting_method TEXT,                    -- Método usado (gel, pó, água, etc.)
    rooting_medium TEXT,                    -- Meio de enraizamento (rockwool, jiffy, etc.)
    
    -- Notas
    notes TEXT,
    
    -- Metadados
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    
    FOREIGN KEY (mother_plant_id) REFERENCES plants(id) ON DELETE RESTRICT,
    FOREIGN KEY (destination_plant_id) REFERENCES plants(id) ON DELETE SET NULL
);

-- ============================================
-- ALTERAÇÕES NA TABELA plants
-- Adicionar campos de rastreabilidade genética
-- ============================================

-- Campo para relacionar com lote de sementes (opcional)
ALTER TABLE plants ADD COLUMN seed_batch_id INTEGER REFERENCES seed_batches(id) ON DELETE SET NULL;

-- Campo para relacionar com clone de origem (opcional)
ALTER TABLE plants ADD COLUMN source_clone_id INTEGER REFERENCES clones(id) ON DELETE SET NULL;

-- Campo para indicar tipo de origem
ALTER TABLE plants ADD COLUMN origin_type TEXT DEFAULT 'unknown' 
    CHECK(origin_type IN ('seed', 'clone', 'unknown'));

-- Campo para foto de perfil da planta
ALTER TABLE plants ADD COLUMN profile_photo TEXT;

-- ============================================
-- ÍNDICES para Performance
-- ============================================

-- Genetic Strains
CREATE INDEX IF NOT EXISTS idx_genetic_strains_name ON genetic_strains(name);
CREATE INDEX IF NOT EXISTS idx_genetic_strains_breeder ON genetic_strains(breeder);
CREATE INDEX IF NOT EXISTS idx_genetic_strains_type ON genetic_strains(type);
CREATE INDEX IF NOT EXISTS idx_genetic_strains_active ON genetic_strains(is_active);

-- Seed Batches
CREATE INDEX IF NOT EXISTS idx_seed_batches_genetic ON seed_batches(genetic_strain_id);
CREATE INDEX IF NOT EXISTS idx_seed_batches_code ON seed_batches(batch_code);
CREATE INDEX IF NOT EXISTS idx_seed_batches_active ON seed_batches(is_active);
CREATE INDEX IF NOT EXISTS idx_seed_batches_quantity ON seed_batches(current_quantity);

-- Clones
CREATE INDEX IF NOT EXISTS idx_clones_mother ON clones(mother_plant_id);
CREATE INDEX IF NOT EXISTS idx_clones_destination ON clones(destination_plant_id);
CREATE INDEX IF NOT EXISTS idx_clones_status ON clones(status);
CREATE INDEX IF NOT EXISTS idx_clones_code ON clones(clone_code);

-- Plants (novos índices)
CREATE INDEX IF NOT EXISTS idx_plants_seed_batch ON plants(seed_batch_id);
CREATE INDEX IF NOT EXISTS idx_plants_source_clone ON plants(source_clone_id);
CREATE INDEX IF NOT EXISTS idx_plants_origin_type ON plants(origin_type);

-- ============================================
-- TRIGGERS
-- ============================================

-- Atualizar updated_at em genetic_strains
CREATE TRIGGER IF NOT EXISTS update_genetic_strains_timestamp 
AFTER UPDATE ON genetic_strains
FOR EACH ROW
BEGIN
    UPDATE genetic_strains SET updated_at = datetime('now', 'localtime')
    WHERE id = NEW.id;
END;

-- Atualizar updated_at em seed_batches
CREATE TRIGGER IF NOT EXISTS update_seed_batches_timestamp 
AFTER UPDATE ON seed_batches
FOR EACH ROW
BEGIN
    UPDATE seed_batches SET updated_at = datetime('now', 'localtime')
    WHERE id = NEW.id;
END;

-- Atualizar updated_at em clones
CREATE TRIGGER IF NOT EXISTS update_clones_timestamp 
AFTER UPDATE ON clones
FOR EACH ROW
BEGIN
    UPDATE clones SET updated_at = datetime('now', 'localtime')
    WHERE id = NEW.id;
END;

-- Decrementar quantidade de sementes ao plantar
CREATE TRIGGER IF NOT EXISTS decrement_seed_quantity
AFTER INSERT ON plants
FOR EACH ROW
WHEN NEW.seed_batch_id IS NOT NULL
BEGIN
    UPDATE seed_batches 
    SET current_quantity = current_quantity - 1,
        plants_generated = plants_generated + 1
    WHERE id = NEW.seed_batch_id AND current_quantity > 0;
END;

-- Calcular dias para enraizar clone
CREATE TRIGGER IF NOT EXISTS calculate_clone_rooting_days
AFTER UPDATE OF rooting_date ON clones
FOR EACH ROW
WHEN NEW.rooting_date IS NOT NULL AND OLD.rooting_date IS NULL
BEGIN
    UPDATE clones 
    SET days_to_root = CAST((julianday(NEW.rooting_date) - julianday(NEW.cut_date)) AS INTEGER)
    WHERE id = NEW.id;
END;

-- ============================================
-- VIEWS
-- ============================================

-- View: Genéticas com estatísticas
CREATE VIEW IF NOT EXISTS v_genetic_stats AS
SELECT 
    gs.*,
    (SELECT COUNT(*) FROM seed_batches WHERE genetic_strain_id = gs.id AND is_active = 1) as active_batches,
    (SELECT COALESCE(SUM(current_quantity), 0) FROM seed_batches WHERE genetic_strain_id = gs.id AND is_active = 1) as total_seeds,
    (SELECT COUNT(*) FROM plants p 
     INNER JOIN seed_batches sb ON p.seed_batch_id = sb.id 
     WHERE sb.genetic_strain_id = gs.id) as total_plants
FROM genetic_strains gs;

-- View: Lotes de sementes com info da genética
CREATE VIEW IF NOT EXISTS v_seed_batches_full AS
SELECT 
    sb.*,
    gs.name as genetic_name,
    gs.breeder,
    gs.type as genetic_type,
    gs.flowering_time_min,
    gs.flowering_time_max
FROM seed_batches sb
LEFT JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id;

-- View: Clones com info completa
CREATE VIEW IF NOT EXISTS v_clones_full AS
SELECT 
    c.*,
    mp.name as mother_plant_name,
    mp.code as mother_plant_code,
    mp.genetic as mother_genetic,
    dp.name as destination_plant_name,
    dp.code as destination_plant_code
FROM clones c
LEFT JOIN plants mp ON c.mother_plant_id = mp.id
LEFT JOIN plants dp ON c.destination_plant_id = dp.id;

-- View: Plantas com rastreabilidade completa
CREATE VIEW IF NOT EXISTS v_plants_genetic_trace AS
SELECT 
    p.*,
    sb.batch_code as seed_batch_code,
    gs.name as genetic_strain_name,
    gs.breeder as genetic_breeder,
    gs.type as genetic_type,
    c.clone_code as source_clone_code,
    mp.name as mother_plant_name,
    mp.code as mother_plant_code
FROM plants p
LEFT JOIN seed_batches sb ON p.seed_batch_id = sb.id
LEFT JOIN genetic_strains gs ON sb.genetic_strain_id = gs.id
LEFT JOIN clones c ON p.source_clone_id = c.id
LEFT JOIN plants mp ON c.mother_plant_id = mp.id;

-- ============================================
-- DADOS INICIAIS (opcional)
-- ============================================

-- Você pode inserir algumas genéticas populares como exemplo:
-- INSERT INTO genetic_strains (name, breeder, type, indica_percentage, sativa_percentage, difficulty)
-- VALUES 
--     ('Girl Scout Cookies', 'Cookie Fam', 'hybrid', 60, 40, 'medium'),
--     ('OG Kush', 'Unknown', 'hybrid', 55, 45, 'medium'),
--     ('Blue Dream', 'DJ Short', 'hybrid', 40, 60, 'easy');
