-- Migration para adicionar sistema de sensores
-- Aplica o schema de sensores ao banco grow.db
-- Data: 2024-12-08

BEGIN TRANSACTION;

-- Verificar se as tabelas já existem
SELECT CASE 
  WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='sensors')
  THEN 'Tabela sensors já existe'
  ELSE 'Criando tabela sensors'
END as status;

-- Criar tabela de sensores
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

-- Criar tabela de leituras dos sensores
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

-- Criar trigger
CREATE TRIGGER IF NOT EXISTS update_sensors_timestamp
AFTER UPDATE ON sensors
FOR EACH ROW
BEGIN
  UPDATE sensors 
  SET updated_at = datetime('now', '-3 hours')
  WHERE id = NEW.id;
END;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id 
  ON sensor_readings(sensor_id);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at 
  ON sensor_readings(recorded_at);

CREATE INDEX IF NOT EXISTS idx_sensors_is_active 
  ON sensors(is_active);

-- Criar views
DROP VIEW IF EXISTS v_latest_sensor_readings;
CREATE VIEW v_latest_sensor_readings AS
SELECT 
  s.id as sensor_id,
  s.name as sensor_name,
  s.location,
  sr.temperature,
  sr.humidity,
  sr.recorded_at,
  sr.notes
FROM sensors s
LEFT JOIN sensor_readings sr ON s.id = sr.sensor_id
WHERE s.is_active = 1
  AND sr.id = (
    SELECT id 
    FROM sensor_readings 
    WHERE sensor_id = s.id 
    ORDER BY recorded_at DESC 
    LIMIT 1
  )
ORDER BY s.name;

DROP VIEW IF EXISTS v_daily_sensor_averages;
CREATE VIEW v_daily_sensor_averages AS
SELECT 
  s.id as sensor_id,
  s.name as sensor_name,
  s.location,
  DATE(sr.recorded_at) as date,
  ROUND(AVG(sr.temperature), 1) as avg_temperature,
  ROUND(AVG(sr.humidity), 1) as avg_humidity,
  ROUND(MIN(sr.temperature), 1) as min_temperature,
  ROUND(MAX(sr.temperature), 1) as max_temperature,
  ROUND(MIN(sr.humidity), 1) as min_humidity,
  ROUND(MAX(sr.humidity), 1) as max_humidity,
  COUNT(*) as reading_count
FROM sensors s
INNER JOIN sensor_readings sr ON s.id = sr.sensor_id
GROUP BY s.id, s.name, s.location, DATE(sr.recorded_at)
ORDER BY DATE(sr.recorded_at) DESC, s.name;

-- Inserir sensores iniciais de exemplo
INSERT INTO sensors (name, type, location, description) VALUES
  ('Sensor Superior', 'temperature_humidity', 'Próximo à iluminação', 'Sensor instalado na parte superior da estufa, próximo às lâmpadas'),
  ('Sensor Solo', 'temperature_humidity', 'Nível do solo', 'Sensor posicionado no solo junto às plantas');

SELECT 'Migration concluída com sucesso!' as status;
SELECT COUNT(*) || ' sensores cadastrados' as sensors FROM sensors;

COMMIT;
