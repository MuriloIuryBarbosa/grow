const { getDatabase } = require('../services/database.service');
const db = getDatabase();

class SensorReadingRepository {
  /**
   * Buscar todas as leituras de um sensor
   */
  findBySensorId(sensorId, limit = 100) {
    return db.all(
      `SELECT * FROM sensor_readings 
       WHERE sensor_id = ? 
       ORDER BY recorded_at DESC 
       LIMIT ?`,
      [sensorId, limit]
    );
  }

  /**
   * Buscar leituras por período
   */
  findByDateRange(sensorId, startDate, endDate) {
    if (sensorId) {
      return db.all(
        `SELECT * FROM sensor_readings 
         WHERE sensor_id = ? 
         AND DATE(recorded_at) BETWEEN DATE(?) AND DATE(?)
         ORDER BY recorded_at ASC`,
        [sensorId, startDate, endDate]
      );
    }
    
    // Buscar de todos os sensores
    return db.all(
      `SELECT sr.*, s.name as sensor_name, s.location 
       FROM sensor_readings sr
       INNER JOIN sensors s ON sr.sensor_id = s.id
       WHERE DATE(sr.recorded_at) BETWEEN DATE(?) AND DATE(?)
       ORDER BY sr.recorded_at ASC`,
      [startDate, endDate]
    );
  }

  /**
   * Buscar médias diárias
   */
  getDailyAverages(startDate, endDate, sensorId = null) {
    if (sensorId) {
      return db.all(
        `SELECT * FROM v_daily_sensor_averages 
         WHERE sensor_id = ? 
         AND date BETWEEN DATE(?) AND DATE(?)
         ORDER BY date ASC`,
        [sensorId, startDate, endDate]
      );
    }
    
    return db.all(
      `SELECT * FROM v_daily_sensor_averages 
       WHERE date BETWEEN DATE(?) AND DATE(?)
       ORDER BY date ASC, sensor_name`,
      [startDate, endDate]
    );
  }

  /**
   * Criar nova leitura
   */
  create(data) {
    const { sensor_id, temperature, humidity, recorded_at, notes } = data;
    
    // Validar que pelo menos temperatura ou umidade foi fornecida
    if (temperature === undefined && humidity === undefined) {
      throw new Error('Pelo menos temperatura ou umidade deve ser informada');
    }

    const timestamp = recorded_at || db.getLocalTimestamp();
    
    const result = db.run(
      `INSERT INTO sensor_readings (sensor_id, temperature, humidity, recorded_at, notes) 
       VALUES (?, ?, ?, ?, ?)`,
      [sensor_id, temperature || null, humidity || null, timestamp, notes || null]
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * Criar múltiplas leituras (batch insert)
   */
  createBatch(readings) {
    return db.transaction(() => {
      const results = [];
      for (const reading of readings) {
        results.push(this.create(reading));
      }
      return results;
    });
  }

  /**
   * Buscar leitura por ID
   */
  findById(id) {
    return db.get(
      `SELECT sr.*, s.name as sensor_name, s.location 
       FROM sensor_readings sr
       INNER JOIN sensors s ON sr.sensor_id = s.id
       WHERE sr.id = ?`,
      [id]
    );
  }

  /**
   * Atualizar leitura
   */
  update(id, data) {
    const { temperature, humidity, recorded_at, notes } = data;
    
    db.run(
      `UPDATE sensor_readings 
       SET temperature = ?, humidity = ?, recorded_at = ?, notes = ?
       WHERE id = ?`,
      [temperature || null, humidity || null, recorded_at, notes || null, id]
    );

    return this.findById(id);
  }

  /**
   * Deletar leitura
   */
  delete(id) {
    db.run('DELETE FROM sensor_readings WHERE id = ?', [id]);
    return true;
  }

  /**
   * Deletar todas as leituras de um sensor
   */
  deleteBySensorId(sensorId) {
    db.run('DELETE FROM sensor_readings WHERE sensor_id = ?', [sensorId]);
    return true;
  }

  /**
   * Buscar última leitura de um sensor
   */
  getLatestBySensorId(sensorId) {
    return db.get(
      `SELECT * FROM sensor_readings 
       WHERE sensor_id = ? 
       ORDER BY recorded_at DESC 
       LIMIT 1`,
      [sensorId]
    );
  }

  /**
   * Obter estatísticas gerais
   */
  getStats(sensorId = null) {
    if (sensorId) {
      return db.get(
        `SELECT 
          COUNT(*) as total_readings,
          ROUND(AVG(temperature), 1) as avg_temperature,
          ROUND(MIN(temperature), 1) as min_temperature,
          ROUND(MAX(temperature), 1) as max_temperature,
          ROUND(AVG(humidity), 1) as avg_humidity,
          ROUND(MIN(humidity), 1) as min_humidity,
          ROUND(MAX(humidity), 1) as max_humidity,
          MIN(recorded_at) as first_reading,
          MAX(recorded_at) as last_reading
         FROM sensor_readings 
         WHERE sensor_id = ?`,
        [sensorId]
      );
    }

    return db.get(
      `SELECT 
        COUNT(*) as total_readings,
        COUNT(DISTINCT sensor_id) as total_sensors,
        ROUND(AVG(temperature), 1) as avg_temperature,
        ROUND(AVG(humidity), 1) as avg_humidity,
        MIN(recorded_at) as first_reading,
        MAX(recorded_at) as last_reading
       FROM sensor_readings`
    );
  }
}

module.exports = new SensorReadingRepository();
