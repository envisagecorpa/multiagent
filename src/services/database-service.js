import sqlite3InitModule from '@sqlite.org/sqlite-wasm'

/**
 * Database Service for Photo Album Application
 * Handles SQLite WASM database initialization, schema creation, and migrations
 */
export class DatabaseService {
  constructor() {
    this.db = null
    this.sqlite3 = null
    this.isInitialized = false
  }

  /**
   * Initialize SQLite WASM database
   * @returns {Promise<Object>} Database instance
   */
  async initialize() {
    if (this.isInitialized) {
      return this.db
    }

    try {
      // Initialize SQLite WASM
      this.sqlite3 = await sqlite3InitModule({
        print: console.log,
        printErr: console.error,
      })

      // Create in-memory database (can be changed to persistent later)
      this.db = new this.sqlite3.oo1.DB(':memory:')
      
      // Enable foreign keys
      this.db.exec('PRAGMA foreign_keys = ON')
      
      // Create schema
      await this.createSchema()
      
      // Initialize schema version tracking
      await this.initializeSchemaVersioning()
      
      this.isInitialized = true
      return this.db
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }
  }

  /**
   * Create database schema with all tables and indexes
   */
  async createSchema() {
    const schemaSql = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        preferences JSON DEFAULT '{}'
      );

      -- Albums table
      CREATE TABLE IF NOT EXISTS albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        date_range_start DATE,
        date_range_end DATE,
        sort_order INTEGER NOT NULL,
        photo_count INTEGER DEFAULT 0,
        cover_photo_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (cover_photo_id) REFERENCES photos(id) ON DELETE SET NULL
      );

      -- Photos table
      CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        album_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        date_taken DATETIME,
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
        thumbnail_path TEXT,
        exif_data JSON DEFAULT '{}',
        FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
      );

      -- User sessions table
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);
      CREATE INDEX IF NOT EXISTS idx_albums_sort_order ON albums(user_id, sort_order);
      CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id);
      CREATE INDEX IF NOT EXISTS idx_photos_date_taken ON photos(date_taken);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
    `

    this.db.exec(schemaSql)
  }

  /**
   * Initialize schema version tracking
   */
  async initializeSchemaVersioning() {
    const versionSql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      INSERT OR IGNORE INTO schema_migrations (version) VALUES ('1.0.0');
    `
    
    this.db.exec(versionSql)
  }

  /**
   * Get current schema version
   * @returns {Promise<string>} Current schema version
   */
  async getCurrentSchemaVersion() {
    const stmt = this.db.prepare('SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1')
    const result = stmt.get()
    stmt.finalize()
    return result?.version || '0.0.0'
  }

  /**
   * Apply database migration
   * @param {string} version - Migration version
   * @param {string[]} sqlStatements - SQL statements to execute
   */
  async applyMigration(version, sqlStatements) {
    try {
      // Begin transaction
      this.db.exec('BEGIN TRANSACTION')

      // Execute migration statements
      for (const sql of sqlStatements) {
        this.db.exec(sql)
      }

      // Record migration
      const stmt = this.db.prepare('INSERT INTO schema_migrations (version) VALUES (?)')
      stmt.run(version)
      stmt.finalize()

      // Commit transaction
      this.db.exec('COMMIT')
    } catch (error) {
      // Rollback on error
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      this.db.close()
      this.db = null
      this.isInitialized = false
    }
  }

  /**
   * Get database instance (for direct queries if needed)
   * @returns {Object} SQLite database instance
   */
  getDatabase() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.db
  }
}