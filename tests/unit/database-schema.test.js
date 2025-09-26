import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseService } from '../../src/services/database-service.js'

describe('Database Schema Tests', () => {
  let db
  let dbService

  beforeEach(async () => {
    // Initialize database service - this will fail until implementation exists
    dbService = new DatabaseService()
    db = await dbService.initialize()
  })

  afterEach(async () => {
    if (db) {
      await db.close()
    }
  })

  it('should create users table with correct schema', async () => {
    const result = db.exec(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='users'
    `)
    
    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThan(0)
    
    const sql = result[0].values[0][0]
    expect(sql).toContain('id INTEGER PRIMARY KEY')
    expect(sql).toContain('email TEXT UNIQUE NOT NULL')
    expect(sql).toContain('password_hash TEXT NOT NULL')
    expect(sql).toContain('display_name TEXT')
    expect(sql).toContain('created_at DATETIME')
    expect(sql).toContain('last_login DATETIME')
    expect(sql).toContain('preferences JSON')
  })

  it('should create albums table with correct schema', async () => {
    const result = db.exec(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='albums'
    `)
    
    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThan(0)
    
    const sql = result[0].values[0][0]
    expect(sql).toContain('id INTEGER PRIMARY KEY')
    expect(sql).toContain('user_id INTEGER NOT NULL')
    expect(sql).toContain('name TEXT NOT NULL')
    expect(sql).toContain('description TEXT')
    expect(sql).toContain('sort_order INTEGER NOT NULL')
    expect(sql).toContain('photo_count INTEGER DEFAULT 0')
    expect(sql).toContain('FOREIGN KEY (user_id) REFERENCES users(id)')
  })

  it('should create photos table with correct schema', async () => {
    const result = await db.exec(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='photos'
    `)
    
    expect(result).toBeDefined()
    expect(result[0].columns).toContain('id')
    expect(result[0].columns).toContain('album_id')
    expect(result[0].columns).toContain('filename')
    expect(result[0].columns).toContain('original_name')
    expect(result[0].columns).toContain('file_size')
    expect(result[0].columns).toContain('mime_type')
    expect(result[0].columns).toContain('width')
    expect(result[0].columns).toContain('height')
    expect(result[0].columns).toContain('date_taken')
    expect(result[0].columns).toContain('date_added')
    expect(result[0].columns).toContain('thumbnail_path')
    expect(result[0].columns).toContain('exif_data')
  })

  it('should create user_sessions table with correct schema', async () => {
    const result = await db.exec(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='user_sessions'
    `)
    
    expect(result).toBeDefined()
    expect(result[0].columns).toContain('id')
    expect(result[0].columns).toContain('user_id')
    expect(result[0].columns).toContain('session_token')
    expect(result[0].columns).toContain('expires_at')
    expect(result[0].columns).toContain('created_at')
    expect(result[0].columns).toContain('last_accessed')
  })

  it('should create proper indexes for performance', async () => {
    const indexes = await db.exec(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND tbl_name IN ('users', 'albums', 'photos', 'user_sessions')
    `)
    
    // Expect indexes for foreign keys and frequently queried columns
    const indexNames = indexes.map(idx => idx.name)
    expect(indexNames).toContain('idx_albums_user_id')
    expect(indexNames).toContain('idx_photos_album_id')
    expect(indexNames).toContain('idx_users_email')
    expect(indexNames).toContain('idx_sessions_token')
  })

  it('should enforce foreign key constraints', async () => {
    const fkCheck = await db.exec('PRAGMA foreign_keys')
    expect(fkCheck[0].foreign_keys).toBe(1)
  })
})