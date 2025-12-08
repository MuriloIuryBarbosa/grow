const { getDatabase } = require('../services/database.service');
const db = getDatabase();

class SensorRepository {
  /**
   * Buscar todos os sensores
   */
  findAll(includeInactive = false) {
    const query = includeInactive 
      ? 'SELECT * FROM sensors ORDER BY name'
      : 'SELECT * FROM sensors WHERE is_active = 1 ORDER BY name';
    
    return db.all(query);
  }

  /**
   * Buscar sensor por ID
   */
  findById(id) {
    return db.get('SELECT * FROM sensors WHERE id = ?', [id]);
  }

  /**
   * Criar novo sensor
   */
  create(data) {
    const { name, type, location, description } = data;
    
    const result = db.run(
      `INSERT INTO sensors (name, type, location, description) 
       VALUES (?, ?, ?, ?)`,
      [name, type, location, description || null]
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * Atualizar sensor
   */
  update(id, data) {
    const { name, type, location, description, is_active } = data;
    
    db.run(
      `UPDATE sensors 
       SET name = ?, type = ?, location = ?, description = ?, is_active = ?
       WHERE id = ?`,
      [name, type, location, description || null, is_active !== undefined ? is_active : 1, id]
    );

    return this.findById(id);
  }

  /**
   * Ativar/Desativar sensor
   */
  toggleActive(id, isActive) {
    db.run(
      'UPDATE sensors SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, id]
    );

    return this.findById(id);
  }

  /**
   * Deletar sensor (soft delete - desativa)
   */
  delete(id) {
    return this.toggleActive(id, false);
  }

  /**
   * Deletar sensor permanentemente
   */
  hardDelete(id) {
    db.run('DELETE FROM sensors WHERE id = ?', [id]);
    return true;
  }

  /**
   * Buscar última leitura de cada sensor ativo
   */
  getLatestReadings() {
    return db.all('SELECT * FROM v_latest_sensor_readings');
  }
}

module.exports = new SensorRepository();
