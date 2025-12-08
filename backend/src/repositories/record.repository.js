const { getDatabase } = require('../services/database.service');

class RecordRepository {
  constructor() {
    this.db = getDatabase();
    this.initStatements();
  }

  initStatements() {
    this.statements = {
      getByPlantId: this.db.db.prepare(`
        SELECT * FROM daily_records 
        WHERE plant_id = ? 
        ORDER BY record_date DESC
      `),
      getById: this.db.db.prepare(`
        SELECT * FROM daily_records 
        WHERE id = ? AND plant_id = ?
      `),
      getLatestByPlantId: this.db.db.prepare(`
        SELECT * FROM v_latest_records 
        WHERE plant_id = ?
      `),
      create: this.db.db.prepare(`
        INSERT INTO daily_records (
          plant_id, record_date, location,
          plant_size, leaf_count, branch_count,
          temperature, humidity, ppfd, vpd,
          fertilization, observations, photo_path,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      update: this.db.db.prepare(`
        UPDATE daily_records SET
          record_date = ?, location = ?,
          plant_size = ?, leaf_count = ?, branch_count = ?,
          temperature = ?, humidity = ?, ppfd = ?, vpd = ?,
          fertilization = ?, observations = ?,
          photo_path = COALESCE(?, photo_path)
        WHERE id = ? AND plant_id = ?
      `),
      delete: this.db.db.prepare('DELETE FROM daily_records WHERE id = ? AND plant_id = ?')
    };
  }

  // Buscar todos os registros de uma planta
  findByPlantId(plantId) {
    return this.statements.getByPlantId.all(plantId);
  }

  // Buscar registro específico
  findById(recordId, plantId) {
    return this.statements.getById.get(recordId, plantId);
  }

  // Buscar último registro de uma planta
  findLatestByPlantId(plantId) {
    return this.statements.getLatestByPlantId.get(plantId);
  }

  // Criar novo registro
  create(recordData) {
    const {
      plant_id, record_date, location,
      plant_size, leaf_count, branch_count,
      temperature, humidity, ppfd, vpd,
      fertilization, observations, photo_path
    } = recordData;

    const created_at = this.db.getLocalTimestamp();

    const result = this.statements.create.run(
      plant_id, record_date, location || null,
      plant_size || null, leaf_count || null, branch_count || null,
      temperature || null, humidity || null, ppfd || null, vpd || null,
      fertilization || null, observations || null, photo_path || null,
      created_at
    );

    return this.findById(result.lastInsertRowid, plant_id);
  }

  // Atualizar registro
  update(recordId, plantId, recordData) {
    const {
      record_date, location,
      plant_size, leaf_count, branch_count,
      temperature, humidity, ppfd, vpd,
      fertilization, observations, photo_path
    } = recordData;

    this.statements.update.run(
      record_date, location,
      plant_size, leaf_count, branch_count,
      temperature, humidity, ppfd, vpd,
      fertilization, observations, photo_path,
      recordId, plantId
    );

    return this.findById(recordId, plantId);
  }

  // Deletar registro
  delete(recordId, plantId) {
    this.statements.delete.run(recordId, plantId);
    return true;
  }
}

module.exports = new RecordRepository();
