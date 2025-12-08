-- ============================================
-- Script de Migração de Dados
-- Migra dados do banco antigo para nova estrutura
-- ============================================

-- Backup dos dados antigos
CREATE TABLE IF NOT EXISTS _backup_plants AS SELECT * FROM plants;
CREATE TABLE IF NOT EXISTS _backup_daily_records AS SELECT * FROM daily_records;
CREATE TABLE IF NOT EXISTS _backup_phase_history AS SELECT * FROM phase_history;

-- Limpar tabelas existentes (preservando backup)
DELETE FROM phase_history;
DELETE FROM daily_records;
DELETE FROM plants;

-- Resetar sequences
DELETE FROM sqlite_sequence WHERE name IN ('plants', 'daily_records', 'phase_history');

-- ============================================
-- Migrar PLANTS
-- ============================================
INSERT INTO plants (
    id, name, genetic, code, planting_date, germination_date, 
    days_to_germination, substrate, substrate_other, current_phase,
    current_location, photo_path, status, failure_date, failure_reason,
    created_at, updated_at
)
SELECT 
    id, name, genetic, code, planting_date, germination_date,
    days_to_germination, substrate, substrate_other, current_phase,
    current_location, photo_path, 
    COALESCE(status, 'ativa') as status,
    failure_date, failure_reason,
    created_at,
    COALESCE(created_at, datetime('now', 'localtime')) as updated_at
FROM _backup_plants;

-- ============================================
-- Migrar PHASE_HISTORY
-- ============================================
INSERT INTO phase_history (
    id, plant_id, phase, started_at, ended_at, 
    duration_days, notes, created_at
)
SELECT 
    id, plant_id, phase, started_at, ended_at,
    duration_days, notes, created_at
FROM _backup_phase_history;

-- ============================================
-- Migrar DAILY_RECORDS
-- ============================================
INSERT INTO daily_records (
    id, plant_id, record_date, location,
    plant_size, leaf_count, branch_count,
    temperature, humidity, ppfd, vpd,
    fertilization, observations, photo_path,
    created_at, updated_at
)
SELECT 
    id, plant_id, record_date, location,
    plant_size, leaf_count, branch_count,
    temperature, humidity, ppfd, vpd,
    fertilization, observations, photo_path,
    created_at,
    COALESCE(created_at, datetime('now', 'localtime')) as updated_at
FROM _backup_daily_records;

-- ============================================
-- Verificar integridade
-- ============================================
SELECT 
    'Plants migrated: ' || COUNT(*) as status FROM plants
UNION ALL
SELECT 
    'Phase history migrated: ' || COUNT(*) FROM phase_history
UNION ALL
SELECT 
    'Daily records migrated: ' || COUNT(*) FROM daily_records;

-- ============================================
-- Limpar backups (descomente para remover)
-- ============================================
-- DROP TABLE _backup_plants;
-- DROP TABLE _backup_daily_records;
-- DROP TABLE _backup_phase_history;
