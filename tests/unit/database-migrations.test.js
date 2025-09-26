import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseService } from '../../src/services/database-service.js'

describe('Database Migration Tests', () => {
  let dbService
  let db

  beforeEach(async () => {
    dbService = new DatabaseService()
    db = await dbService.initialize()
  })

  afterEach(async () => {
    if (db) {
      await db.close()
    }
  })

  it('should track schema version', async () => {
    const result = await db.exec(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='schema_migrations'
    `)
    
    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThan(0)
  })

  it('should have current schema version', async () => {
    const version = await dbService.getCurrentSchemaVersion()
    expect(version).toBe('1.0.0')
  })

  it('should handle schema updates gracefully', async () => {
    // Test that migrations can be applied without data loss
    const initialVersion = await dbService.getCurrentSchemaVersion()
    
    // Simulate applying a migration
    await dbService.applyMigration('1.0.1', [
      'ALTER TABLE users ADD COLUMN theme TEXT DEFAULT "light"'
    ])
    
    const newVersion = await dbService.getCurrentSchemaVersion()
    expect(newVersion).toBe('1.0.1')
  })

  it('should rollback failed migrations', async () => {
    const initialVersion = await dbService.getCurrentSchemaVersion()
    
    try {
      // Attempt invalid migration
      await dbService.applyMigration('1.0.2', [
        'ALTER TABLE nonexistent_table ADD COLUMN test TEXT'
      ])
    } catch (error) {
      // Migration should fail and rollback
      expect(error).toBeDefined()
    }
    
    const currentVersion = await dbService.getCurrentSchemaVersion()
    expect(currentVersion).toBe(initialVersion)
  })

  it('should maintain data integrity during migrations', async () => {
    // Insert test data
    await db.exec(`
      INSERT INTO users (email, password_hash, display_name) 
      VALUES ('test@example.com', 'hash123', 'Test User')
    `)
    
    // Apply migration
    await dbService.applyMigration('1.0.3', [
      'ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT "UTC"'
    ])
    
    // Verify data is preserved
    const result = await db.exec('SELECT * FROM users WHERE email = "test@example.com"')
    expect(result[0].values[0][1]).toBe('test@example.com')
    expect(result[0].values[0][3]).toBe('Test User')
  })
})