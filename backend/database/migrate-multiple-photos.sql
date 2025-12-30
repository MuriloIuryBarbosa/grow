-- ============================================
-- Migração: Adicionar suporte para múltiplas fotos nos registros diários
-- Data: 2025-12-29
-- Descrição: Cria a tabela daily_record_photos para armazenar múltiplas fotos por registro
-- ============================================

BEGIN TRANSACTION;

-- Verificar se a tabela já existe
SELECT 'Verificando se a tabela daily_record_photos já existe...' as status;

-- Criar tabela para múltiplas fotos por registro (se não existir)
CREATE TABLE IF NOT EXISTS daily_record_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    photo_path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (record_id) REFERENCES daily_records(id) ON DELETE CASCADE
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_daily_record_photos_record_id ON daily_record_photos(record_id);

-- Migrar fotos existentes da coluna photo_path para a nova tabela
-- Apenas registros que têm photo_path preenchido e ainda não foram migrados
INSERT INTO daily_record_photos (record_id, photo_path)
SELECT dr.id, dr.photo_path
FROM daily_records dr
WHERE dr.photo_path IS NOT NULL
  AND dr.photo_path != ''
  AND NOT EXISTS (
    SELECT 1 FROM daily_record_photos drp
    WHERE drp.record_id = dr.id
  );

-- Exibir estatísticas da migração
SELECT 'Migração concluída!' as status;
SELECT COUNT(*) || ' fotos migradas da coluna photo_path' as resultado
FROM daily_record_photos
WHERE record_id IN (
  SELECT id FROM daily_records WHERE photo_path IS NOT NULL
);

-- Verificar estrutura final
SELECT 'Estrutura das tabelas:' as info;
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%daily%';

COMMIT;

-- ============================================
-- Verificações pós-migração
-- ============================================

-- Contar registros por tabela
SELECT
  'daily_records' as table_name,
  COUNT(*) as total_records
FROM daily_records
UNION ALL
SELECT
  'daily_record_photos' as table_name,
  COUNT(*) as total_records
FROM daily_record_photos;

-- Verificar integridade referencial
SELECT 'Verificando integridade referencial...' as status;
SELECT COUNT(*) as orphaned_photos
FROM daily_record_photos drp
LEFT JOIN daily_records dr ON drp.record_id = dr.id
WHERE dr.id IS NULL;

-- Se houver fotos órfãs, exibir aviso
SELECT CASE
  WHEN COUNT(*) > 0 THEN 'ATENÇÃO: ' || COUNT(*) || ' fotos órfãs encontradas!'
  ELSE 'Integridade OK: Nenhuma foto órfã encontrada.'
END as integrity_check
FROM daily_record_photos drp
LEFT JOIN daily_records dr ON drp.record_id = dr.id
WHERE dr.id IS NULL;