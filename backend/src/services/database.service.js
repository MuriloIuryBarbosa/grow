const Database = require('better-sqlite3');
const path = require('path');

class DatabaseService {
  constructor(dbPath) {
    this.db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : null
    });
    
    this.initialize();
  }

  initialize() {
    // Habilitar foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Modo WAL para melhor performance
    this.db.pragma('journal_mode = WAL');
    
    // Configurações de performance
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000');
    this.db.pragma('temp_store = MEMORY');
    
    console.log('✅ Database initialized');
  }

  // Helper: Obter timestamp local (BRT - UTC-3)
  getLocalTimestamp() {
    const now = new Date();
    const offset = -3 * 60; // BRT é UTC-3
    const localDate = new Date(now.getTime() + offset * 60 * 1000);
    return localDate.toISOString().slice(0, 19).replace('T', ' ');
  }

  // Fechar conexão
  close() {
    this.db.close();
  }

  // Executar query genérica
  run(sql, params = []) {
    return this.db.prepare(sql).run(params);
  }

  // Buscar um registro
  get(sql, params = []) {
    return this.db.prepare(sql).get(params);
  }

  // Buscar múltiplos registros
  all(sql, params = []) {
    return this.db.prepare(sql).all(params);
  }

  // Transação
  transaction(fn) {
    return this.db.transaction(fn);
  }
}

// Singleton instance
let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    const dbPath = path.join(__dirname, '../../../grow.db');
    dbInstance = new DatabaseService(dbPath);
  }
  return dbInstance;
}

module.exports = { getDatabase, DatabaseService };
