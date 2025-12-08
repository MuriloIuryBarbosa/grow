const { getDatabase } = require('../services/database.service');

class PlantRepository {
  constructor() {
    this.db = getDatabase();
    this.initStatements();
  }

  initStatements() {
    // Prepared statements para melhor performance
    this.statements = {
      getAll: this.db.db.prepare('SELECT * FROM plants ORDER BY created_at DESC'),
      getById: this.db.db.prepare('SELECT * FROM plants WHERE id = ?'),
      getByCode: this.db.db.prepare('SELECT * FROM plants WHERE code = ?'),
      create: this.db.db.prepare(`
        INSERT INTO plants (
          name, code, genetic, planting_date, germination_date,
          days_to_germination, substrate, substrate_other, current_phase,
          current_location, status, photo_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      update: this.db.db.prepare(`
        UPDATE plants SET
          name = ?, genetic = ?, planting_date = ?, germination_date = ?,
          substrate = ?, substrate_other = ?, current_location = ?,
          photo_path = COALESCE(?, photo_path)
        WHERE id = ?
      `),
      updatePhase: this.db.db.prepare('UPDATE plants SET current_phase = ? WHERE id = ?'),
      updateStatus: this.db.db.prepare('UPDATE plants SET status = ?, failure_date = ?, failure_reason = ? WHERE id = ?'),
      updatePhoto: this.db.db.prepare('UPDATE plants SET photo_path = ? WHERE id = ?'),
      delete: this.db.db.prepare('DELETE FROM plants WHERE id = ?'),
      getStats: this.db.db.prepare('SELECT * FROM v_plants_stats WHERE id = ?')
    };
  }

  // Buscar todas as plantas
  findAll() {
    return this.statements.getAll.all();
  }

  // Buscar planta por ID
  findById(id) {
    return this.statements.getById.get(id);
  }

  // Buscar planta por código
  findByCode(code) {
    return this.statements.getByCode.get(code);
  }

  // Buscar planta com estatísticas
  findByIdWithStats(id) {
    return this.statements.getStats.get(id);
  }

  // Criar nova planta
  create(plantData) {
    const {
      name, code, genetic, planting_date, germination_date,
      days_to_germination, substrate, substrate_other, current_phase,
      current_location, status, photo_path
    } = plantData;

    const result = this.statements.create.run(
      name, code, genetic || null, planting_date, germination_date || null,
      days_to_germination || null, substrate, substrate_other || null,
      current_phase || 'germinacao', current_location || null,
      status || 'ativa', photo_path || null
    );

    return this.findById(result.lastInsertRowid);
  }

  // Atualizar planta
  update(id, plantData) {
    const {
      name, genetic, planting_date, germination_date,
      substrate, substrate_other, current_location, photo_path
    } = plantData;

    this.statements.update.run(
      name, genetic, planting_date, germination_date,
      substrate, substrate_other, current_location,
      photo_path, id
    );

    return this.findById(id);
  }

  // Atualizar fase
  updatePhase(id, phase) {
    this.statements.updatePhase.run(phase, id);
    return this.findById(id);
  }

  // Atualizar status
  updateStatus(id, status, failure_date = null, failure_reason = null) {
    this.statements.updateStatus.run(status, failure_date, failure_reason, id);
    return this.findById(id);
  }

  // Atualizar foto
  updatePhoto(id, photo_path) {
    this.statements.updatePhoto.run(photo_path, id);
    return this.findById(id);
  }

  // Deletar planta
  delete(id) {
    this.statements.delete.run(id);
    return true;
  }
}

module.exports = new PlantRepository();
