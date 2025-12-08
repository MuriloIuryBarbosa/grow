-- Schema para sistema de sensores
-- Versão: 1.0
-- Data: 2024-12-08

-- Tabela de sensores
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

-- Tabela de leituras dos sensores
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

-- Trigger para atualizar updated_at em sensors
CREATE TRIGGER IF NOT EXISTS update_sensors_timestamp
AFTER UPDATE ON sensors
FOR EACH ROW
BEGIN
  UPDATE sensors 
  SET updated_at = datetime('now', '-3 hours')
  WHERE id = NEW.id;
END;

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id 
  ON sensor_readings(sensor_id);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at 
  ON sensor_readings(recorded_at);

CREATE INDEX IF NOT EXISTS idx_sensors_is_active 
  ON sensors(is_active);

-- View para últimas leituras de cada sensor
CREATE VIEW IF NOT EXISTS v_latest_sensor_readings AS
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

-- View para médias diárias
CREATE VIEW IF NOT EXISTS v_daily_sensor_averages AS
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
