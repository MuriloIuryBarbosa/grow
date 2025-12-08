-- Migração de dados de temperatura e umidade dos registros diários para sensores
-- Data: 2025-12-08
-- Descrição: Move dados ambientais de daily_records para sensor_readings

BEGIN TRANSACTION;

-- Verificar se existe o sensor "Sensor Solo"
SELECT 'Verificando sensor de solo...' as status;

-- Buscar ID do Sensor Solo
SELECT id, name, location FROM sensors WHERE name = 'Sensor Solo' LIMIT 1;

-- Inserir leituras dos registros diários que têm temperatura ou umidade
-- Apenas registros que ainda não foram migrados
INSERT INTO sensor_readings (sensor_id, temperature, humidity, recorded_at, notes)
SELECT 
  (SELECT id FROM sensors WHERE name = 'Sensor Solo' LIMIT 1) as sensor_id,
  dr.temperature,
  dr.humidity,
  CASE 
    WHEN dr.record_date LIKE '%T%' THEN dr.record_date
    ELSE dr.record_date || ' 12:00:00'
  END as recorded_at,
  'Migrado de registro diário - Planta ID: ' || dr.plant_id as notes
FROM daily_records dr
WHERE (dr.temperature IS NOT NULL OR dr.humidity IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM sensor_readings sr 
    WHERE sr.sensor_id = (SELECT id FROM sensors WHERE name = 'Sensor Solo' LIMIT 1)
    AND DATE(sr.recorded_at) = DATE(dr.record_date)
    AND sr.notes LIKE '%Planta ID: ' || dr.plant_id || '%'
  )
ORDER BY dr.record_date;

-- Exibir estatísticas
SELECT 'Migração concluída!' as status;
SELECT COUNT(*) || ' leituras migradas' as resultado 
FROM sensor_readings 
WHERE notes LIKE 'Migrado de registro diário%';

SELECT 
  COUNT(DISTINCT DATE(recorded_at)) || ' dias com dados',
  MIN(DATE(recorded_at)) || ' a ' || MAX(DATE(recorded_at)) as periodo
FROM sensor_readings 
WHERE notes LIKE 'Migrado de registro diário%';

COMMIT;
