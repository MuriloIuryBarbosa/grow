const { getDatabase } = require('../services/database.service');

class PhaseHistoryRepository {
  constructor() {
    this.db = getDatabase();
    this.initStatements();
  }

  initStatements() {
    this.statements = {
      getByPlantId: this.db.db.prepare(`
        SELECT * FROM phase_history 
        WHERE plant_id = ? 
        ORDER BY started_at
      `),
      getCurrentPhase: this.db.db.prepare(`
        SELECT * FROM phase_history 
        WHERE plant_id = ? AND ended_at IS NULL
        ORDER BY started_at DESC
        LIMIT 1
      `),
      create: this.db.db.prepare(`
        INSERT INTO phase_history (plant_id, phase, started_at, notes)
        VALUES (?, ?, ?, ?)
      `),
      closePhase: this.db.db.prepare(`
        UPDATE phase_history 
        SET ended_at = ?
        WHERE id = ?
      `)
    };
  }

  // Buscar histórico de fases de uma planta
  findByPlantId(plantId) {
    return this.statements.getByPlantId.all(plantId);
  }

  // Buscar fase atual de uma planta
  findCurrentPhase(plantId) {
    return this.statements.getCurrentPhase.get(plantId);
  }

  // Criar novo registro de fase
  create(plantId, phase, started_at, notes = null) {
    const result = this.statements.create.run(plantId, phase, started_at, notes);
    return result.lastInsertRowid;
  }

  // Fechar fase atual
  closePhase(phaseId, ended_at) {
    this.statements.closePhase.run(ended_at, phaseId);
    return true;
  }

  // Mudar fase de uma planta
  changePlantPhase(plantId, newPhase) {
    const timestamp = this.db.getLocalTimestamp();
    
    return this.db.transaction(() => {
      // Fechar fase atual
      const currentPhase = this.findCurrentPhase(plantId);
      if (currentPhase) {
        this.closePhase(currentPhase.id, timestamp);
      }
      
      // Criar nova fase
      return this.create(plantId, newPhase, timestamp);
    })();
  }
}

module.exports = new PhaseHistoryRepository();
